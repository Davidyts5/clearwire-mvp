import { NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { getRpId, getOrigin, base64ToUint8Array } from '@/lib/webauthn';
import crypto from 'crypto';
import { withAuth, verifyTenantResource } from '@/lib/api-auth';

export const POST = withAuth(['cfo'], async (req, { params }, auth) => {
  await verifyTenantResource(auth.supabase, 'wire_requests', params.id, auth.companyId);

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
      const { newCounter } = verification.authenticationInfo;

      await auth.supabase
        .from('user_authenticators')
        .update({ counter: newCounter })
        .eq('id', authenticator.id);
        
      await auth.supabase
        .from('webauthn_challenges')
        .delete()
        .eq('id', challengeData.id);

      const fidoSignatureHash = crypto.createHash('sha256').update(body.response.signature).digest('hex');

      // FIX: Instead of calling the RPC function (which was missing from the DB), 
      // do the state transition directly via Supabase API to guarantee it works.
      const { data: updatedWire, error: updateError } = await auth.supabase
        .from('wire_requests')
        .update({ 
          status: 'approved',
          cfo_id: auth.userId,
          cryptographic_hash: `0x${fidoSignatureHash}`,
          approved_at: new Date().toISOString()
        })
        .eq('id', params.id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Add audit log
      await auth.supabase.from('audit_logs').insert([{
        company_id: auth.companyId,
        wire_id: params.id,
        actor_id: auth.userId,
        action: 'STATE_CHANGED_TO_APPROVED',
        new_hash: `0x${fidoSignatureHash}`
      }]);

      return NextResponse.json({ success: true, data: updatedWire });
    }

    return NextResponse.json({ error: 'Cryptographic Verification Failed' }, { status: 400 });
  } catch (error: any) {
    console.error("Authentication Verification Error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
});
