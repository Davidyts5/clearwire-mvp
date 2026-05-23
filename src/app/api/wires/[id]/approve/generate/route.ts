import { NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { getRpId } from '@/lib/webauthn';
import { withAuth, verifyTenantResource } from '@/lib/api-auth';

export const POST = withAuth(['cfo'], async (req, { params }, auth) => {
  await verifyTenantResource(auth.supabase, 'wire_requests', params.id, auth.companyId);

  const { data: authenticators } = await auth.supabase
    .from('user_authenticators')
    .select('credential_id, transports')
    .eq('user_id', auth.userId);

  if (!authenticators || authenticators.length === 0) {
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
  await auth.supabase.from('webauthn_challenges').insert([{
    user_id: auth.userId,
    challenge: options.challenge,
    context: context,
    expires_at: new Date(Date.now() + 5 * 60000).toISOString()
  }]);

  return NextResponse.json(options);
});
