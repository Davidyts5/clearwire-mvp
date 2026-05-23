import { NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { getRpId, getOrigin, base64ToUint8Array } from '@/lib/webauthn';
import crypto from 'crypto';
import { withAuth, verifyTenantResource } from '@/lib/api-auth';

export const POST = withAuth(['cfo'], async (req, { params }, auth) => {
  const wire = await verifyTenantResource(auth.supabase, 'wire_requests', params.id, auth.companyId);

  const body = await req.json();
  const context = `wire_approval:${params.id}`;

  const { data: challengeData } = await auth.supabase
    .from('webauthn_challenges')
    .select('*')
    .eq('user_id', auth.userId)
    .eq('context', context)
    .single();

  if (!challengeData || new Date() > new Date(challengeData.expires_at)) {
    return NextResponse.json({ error: 'Challenge expired or missing' }, { status: 400 });
  }

  const { data: authenticator } = await auth.supabase
    .from('user_authenticators')
    .select('*')
    .eq('user_id', auth.userId)
    .eq('credential_id', body.id)
    .single();

  if (!authenticator) return NextResponse.json({ error: 'Authenticator not registered' }, { status: 400 });

  const verification = await verifyAuthenticationResponse({
    response: body,
    expectedChallenge: challengeData.challenge,
    expectedOrigin: getOrigin(req),
    expectedRPID: getRpId(req),
    authenticator: {
      credentialID: authenticator.credential_id,
      credentialPublicKey: base64ToUint8Array(authenticator.credential_public_key),
      counter: Number(authenticator.counter),
    },
  });

  if (verification.verified && verification.authenticationInfo) {
    // Replay Attack Prevention
    await auth.supabase.from('user_authenticators').update({ counter: verification.authenticationInfo.newCounter }).eq('id', authenticator.id);
    await auth.supabase.from('webauthn_challenges').delete().eq('id', challengeData.id);

    const fidoSignatureHash = crypto.createHash('sha256').update(body.response.signature).digest('hex');

    // ATOMIC STATE TRANSITION
    const { data: updatedWire, error: rpcError } = await auth.supabase.rpc('transition_wire_state', {
      p_wire_id: params.id,
      p_new_status: 'approved',
      p_actor_id: auth.userId,
      p_crypto_hash: `0x${fidoSignatureHash}`
    });

    if (rpcError) {
      return NextResponse.json({ error: rpcError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: updatedWire });
  }

  return NextResponse.json({ error: 'Cryptographic Verification Failed' }, { status: 400 });
});
