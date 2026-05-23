import { NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { rpName, getRpId, getOrigin, uint8ArrayToBase64 } from '@/lib/webauthn';
import { withAuth } from '@/lib/api-auth';

export const POST = withAuth(['cfo'], async (req, ctx, auth) => {
  const body = await req.json();

  const { data: challengeData } = await auth.supabase
    .from('webauthn_challenges')
    .select('*')
    .eq('user_id', auth.userId)
    .eq('context', 'registration')
    .single();

  if (!challengeData || new Date() > new Date(challengeData.expires_at)) {
    return NextResponse.json({ error: 'Challenge expired or missing' }, { status: 400 });
  }

  const verification = await verifyRegistrationResponse({
    response: body,
    expectedChallenge: challengeData.challenge,
    expectedOrigin: getOrigin(req),
    expectedRPID: getRpId(req),
  });

  if (verification.verified && verification.registrationInfo) {
    const { credentialPublicKey, credentialID, counter, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

    await auth.supabase.from('user_authenticators').insert([{
      user_id: auth.userId,
      credential_id: body.id,
      credential_public_key: uint8ArrayToBase64(credentialPublicKey),
      counter: counter,
      credential_device_type: credentialDeviceType,
      credential_backed_up: credentialBackedUp,
      transports: body.response.transports || []
    }]);

    await auth.supabase.from('webauthn_challenges').delete().eq('id', challengeData.id);

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
});
