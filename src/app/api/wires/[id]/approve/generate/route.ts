export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { getRpId } from '@/lib/webauthn';
import { withAuth, verifyTenantResource } from '@/lib/api-auth';
import { ROLES } from '@/lib/roles';
import { checkRateLimit } from '@/lib/rate-limit';

export const POST = withAuth([ROLES.CONTROLLER, ROLES.CFO], async (req, { params }, auth) => {
  // RATE LIMITING FIX: Prevent attackers from spamming challenge generation
  const isAllowed = checkRateLimit(`webauthn_gen_${auth.userId}`, 10, 60000);
  if (!isAllowed) {
    return NextResponse.json({ error: 'Rate limit exceeded. Please wait 60 seconds.' }, { status: 429 });
  }

  await verifyTenantResource(auth.supabase, 'wire_requests', params.id, auth.companyId);

  const { data: wireData } = await auth.supabase.from('wire_requests').select('amount').eq('id', params.id).single();
  
  if (auth.role === ROLES.CONTROLLER) {
    const { data: userData } = await auth.supabase.from('users').select('approval_limit').eq('id', auth.userId).single();
    const controllerLimit = userData?.approval_limit || 0;
    if (wireData.amount > controllerLimit) {
      return NextResponse.json({ error: `Unauthorized: You are only authorized to approve wires up to $${Number(controllerLimit).toLocaleString()}` }, { status: 403 });
    }
  }

  const { data: authenticators, error: fetchError } = await auth.supabase
    .from('user_authenticators')
    .select('credential_id, transports')
    .eq('user_id', auth.userId);

  if (fetchError || !authenticators || authenticators.length === 0) {
    return NextResponse.json({ error: 'No registered authenticators found. Please register a device first.' }, { status: 400 });
  }

  const options = await generateAuthenticationOptions({
    rpID: getRpId(req),
    allowCredentials: authenticators.map(a => ({
      id: a.credential_id,
      type: 'public-key',
      transports: a.transports,
    })),
    userVerification: 'required', 
  });

  const context = `wire_approval:${params.id}`;
  await auth.supabase.from('webauthn_challenges').delete().eq('user_id', auth.userId).eq('context', context);
  
  const { error: insertError } = await auth.supabase.from('webauthn_challenges').insert([{
    user_id: auth.userId,
    challenge: options.challenge,
    context: context,
    expires_at: new Date(Date.now() + 5 * 60000).toISOString()
  }]);

  if (insertError) return NextResponse.json({ error: 'Database missing webauthn_challenges table.' }, { status: 500 });

  return NextResponse.json(options);
});
