import { NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { getRpId, getOrigin, base64ToUint8Array } from '@/lib/webauthn';
import crypto from 'crypto';
import { withAuth, verifyTenantResource, verifySegregationOfDuties, getAdminClient } from '@/lib/api-auth';
import { ROLES } from '@/lib/roles';

export const POST = withAuth([ROLES.CONTROLLER, ROLES.CFO], async (req, { params }, auth) => {
  await verifyTenantResource(auth.supabase, 'wire_requests', params.id, auth.companyId);
  await verifySegregationOfDuties(auth.supabase, params.id, auth.userId);

  const { data: wireData } = await auth.supabase.from('wire_requests').select('amount').eq('id', params.id).single();
  
  if (auth.role === ROLES.CONTROLLER) {
    const { data: userData } = await auth.supabase.from('users').select('approval_limit').eq('id', auth.userId).single();
    const controllerLimit = userData?.approval_limit || 0;
    if (wireData.amount > controllerLimit) {
      return NextResponse.json({ error: `Unauthorized: You are only authorized to approve wires up to $${Number(controllerLimit).toLocaleString()}` }, { status: 403 });
    }
  }

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

  try {
    const currentCounter = authenticator.counter != null ? Number(authenticator.counter) : 0;

    const verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge: challengeData.challenge,
      expectedOrigin: getOrigin(req),
      expectedRPID: getRpId(req),
      credential: {
        id: authenticator.credential_id,
        publicKey: base64ToUint8Array(authenticator.credential_public_key),
        counter: currentCounter,
        transports: authenticator.transports,
      },
    });

    if (verification.verified) {
      let updatedCounter = currentCounter;
      if (verification.authenticationInfo && typeof verification.authenticationInfo.newCounter === 'number') {
        updatedCounter = verification.authenticationInfo.newCounter;
      }

      await auth.supabase.from('user_authenticators').update({ counter: updatedCounter }).eq('id', authenticator.id);
      await auth.supabase.from('webauthn_challenges').delete().eq('id', challengeData.id);

      const fidoSignatureHash = crypto.createHash('sha256').update(body.response.signature || 'fallback_hash').digest('hex');

      // 3. ATOMIC STATE MACHINE (Race Condition Fix)
      // Calls the newly restored Stored Procedure that executes SELECT FOR UPDATE.
      // This mathematically guarantees that if two CFOs approve simultaneously,
      // Postgres locks the row, queues them, and throws an exception on the second attempt.
      const adminClient = await getAdminClient();
      const { data: updatedWire, error: rpcError } = await adminClient.rpc('transition_wire_state', {
        p_wire_id: params.id,
        p_new_status: 'approved',
        p_actor_id: auth.userId,
        p_crypto_hash: `0x${fidoSignatureHash}`
      });

      if (rpcError) throw new Error(rpcError.message);

      return NextResponse.json({ success: true, data: updatedWire });
    }

    return NextResponse.json({ error: 'Cryptographic Verification Failed' }, { status: 400 });
  } catch (error: any) {
    console.error("Authentication Verification Error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
});
