import { NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { rpName, getRpId } from '@/lib/webauthn';
import { withAuth } from '@/lib/api-auth';
import { isoUint8Array } from '@simplewebauthn/server/helpers';

// Only CFOs are allowed to register WebAuthn hardware authenticators for wire approvals
export const GET = withAuth(['cfo'], async (req, ctx, auth) => {
  const { data: authenticators } = await auth.supabase
    .from('user_authenticators')
    .select('credential_id')
    .eq('user_id', auth.userId);

  // Convert the UUID string to a Uint8Array as required by @simplewebauthn/server v10+
  const userIDBytes = isoUint8Array.fromUTF8String(auth.userId);

  const options = await generateRegistrationOptions({
    rpName,
    rpID: getRpId(req),
    userID: userIDBytes, // Fixed: Passes Uint8Array instead of string
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
  await auth.supabase.from('webauthn_challenges').insert([{
    user_id: auth.userId,
    challenge: options.challenge,
    context: 'registration',
    expires_at: new Date(Date.now() + 5 * 60000).toISOString()
  }]);

  return NextResponse.json(options);
});
