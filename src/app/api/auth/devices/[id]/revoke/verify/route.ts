export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { getRpId, getOrigin } from '@/lib/webauthn';
import { withAuth, getAdminClient } from '@/lib/api-auth';
import { ROLE_VALUES, ROLES } from '@/lib/roles';

export const POST = withAuth([...ROLE_VALUES], async (req, { params }, auth) => {
  try {
    const body = await req.json();

    const { data: device, error: fetchError } = await auth.supabase
      .from('user_authenticators')
      .select('user_id, revoked, device_name')
      .eq('id', params.id)
      .single();

    if (fetchError || !device) return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    if (device.user_id !== auth.userId && auth.role !== ROLES.CFO) return NextResponse.json({ error: 'Unauthorized to revoke this device' }, { status: 403 });
    if (device.revoked) return NextResponse.json({ error: 'Device is already revoked' }, { status: 400 });

    // Prevent revoking last active device
    const { data: activeDevices, error: countError } = await auth.supabase
      .from('user_authenticators')
      .select('id')
      .eq('user_id', device.user_id)
      .eq('revoked', false);
      
    if (countError) throw countError;
    if (activeDevices.length <= 1) {
      return NextResponse.json({ error: 'You must register another security device before revoking your final active device.' }, { status: 400 });
    }

    const { data: challengeData, error: chalError } = await auth.supabase
      .from('webauthn_challenges')
      .select('*')
      .eq('user_id', auth.userId)
      .eq('context', 'revoke')
      .single();

    if (chalError || !challengeData) return NextResponse.json({ error: 'Challenge expired or missing.' }, { status: 400 });
    if (new Date() > new Date(challengeData.expires_at)) return NextResponse.json({ error: 'Challenge has expired.' }, { status: 400 });

    const { data: authenticator } = await auth.supabase
      .from('user_authenticators')
      .select('*')
      .eq('credential_id', body.id)
      .single();

    if (!authenticator) return NextResponse.json({ error: 'Authenticator not found' }, { status: 400 });

    const verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge: challengeData.challenge,
      expectedOrigin: getOrigin(req),
      expectedRPID: getRpId(req),
      authenticator: {
        credentialID: authenticator.credential_id,
        credentialPublicKey: Buffer.from(authenticator.credential_public_key, 'base64'),
        counter: Number(authenticator.counter),
      },
    });

    if (!verification.verified) return NextResponse.json({ error: 'Cryptographic Verification failed' }, { status: 400 });

    const { authenticationInfo } = verification;
    await auth.supabase.from('user_authenticators').update({ counter: authenticationInfo.newCounter, last_used_at: new Date().toISOString() }).eq('id', authenticator.id);
    await auth.supabase.from('webauthn_challenges').delete().eq('id', challengeData.id);

    // Perform Soft Revoke
    const adminClient = await getAdminClient();
    const { error: revokeError } = await adminClient
      .from('user_authenticators')
      .update({ 
        revoked: true,
        revoked_at: new Date().toISOString(),
        revoked_by: auth.userId
      })
      .eq('id', params.id);

    if (revokeError) throw revokeError;

    // Audit Logging
    await adminClient.from('audit_logs').insert([{
      company_id: auth.companyId,
      wire_id: '00000000-0000-0000-0000-000000000000',
      actor_id: auth.userId,
      action: 'DEVICE_REVOKED',
      new_hash: params.id,
      previous_hash: device.device_name
    }]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
