import { NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { rpName, getRpId } from '@/lib/webauthn';
import { withAuth } from '@/lib/api-auth';
import { isoUint8Array } from '@simplewebauthn/server/helpers';
import { ROLES } from '@/lib/roles';
import { checkRateLimit } from '@/lib/rate-limit';

export const GET = withAuth([ROLES.CFO, ROLES.CONTROLLER], async (req, ctx, auth) => {
  // RATE LIMITING FIX
  const isAllowed = checkRateLimit(`webauthn_reg_gen_${auth.userId}`, 10, 60000);
  if (!isAllowed) {
    return NextResponse.json({ error: 'Rate limit exceeded. Please wait 60 seconds.' }, { status: 429 });
  }

  const { data: authenticators, error: fetchError } = await auth.supabase
    .from('user_authenticators')
    .select('credential_id')
    .eq('user_id', auth.userId);

  if (fetchError) {
    console.error("Fetch Authenticators Error:", fetchError);
    return NextResponse.json({ error: 'Database missing user_authenticators table.' }, { status: 500 });
  }

  const userIDBytes = isoUint8Array.fromUTF8String(auth.userId);

  const options = await generateRegistrationOptions({
    rpName,
    rpID: getRpId(req),
    userID: userIDBytes, 
    userName: `${auth.role}@${auth.companyId}`,
    attestationType: 'none',
    excludeCredentials: (authenticators || []).map(a => ({
      id: a.credential_id,
      type: 'public-key',
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'required',
    },
  });

  await auth.supabase.from('webauthn_challenges').delete().eq('user_id', auth.userId).eq('context', 'registration');
  
  const { error: insertError } = await auth.supabase.from('webauthn_challenges').insert([{
    user_id: auth.userId,
    challenge: options.challenge,
    context: 'registration',
    expires_at: new Date(Date.now() + 5 * 60000).toISOString()
  }]);

  if (insertError) {
    console.error("Insert Challenge Error:", insertError);
    return NextResponse.json({ error: 'Database missing webauthn_challenges table.' }, { status: 500 });
  }

  return NextResponse.json(options);
});
