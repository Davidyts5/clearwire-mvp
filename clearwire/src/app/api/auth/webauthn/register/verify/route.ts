import { NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { rpName, getRpId, getOrigin, uint8ArrayToBase64 } from '@/lib/webauthn';
import { withAuth } from '@/lib/api-auth';
import { ROLES } from '@/lib/roles';

export const POST = withAuth([ROLES.CFO, ROLES.CONTROLLER], async (req, ctx, auth) => {
  const body = await req.json();

  const { data: challengeData, error: fetchError } = await auth.supabase
    .from('webauthn_challenges')
    .select('*')
    .eq('user_id', auth.userId)
    .eq('context', 'registration')
    .single();

  if (fetchError || !challengeData) {
    return NextResponse.json({ error: 'Challenge expired or missing. Please ensure DB tables exist.' }, { status: 400 });
  }

  if (new Date() > new Date(challengeData.expires_at)) {
    return NextResponse.json({ error: 'Challenge has expired.' }, { status: 400 });
  }

  try {
    const verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge: challengeData.challenge,
      expectedOrigin: getOrigin(req),
      expectedRPID: getRpId(req),
    });

    if (verification.verified && verification.registrationInfo) {
      const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
      const { publicKey, id: credentialID, counter } = credential;

      const { error: insertError } = await auth.supabase.from('user_authenticators').insert([{
        user_id: auth.userId,
        credential_id: credentialID, 
        credential_public_key: uint8ArrayToBase64(publicKey), 
        counter: counter,
        credential_device_type: credentialDeviceType,
        credential_backed_up: credentialBackedUp,
        transports: body.response.transports || []
      }]);

      if (insertError) {
        console.error("Insert Authenticator Error:", insertError);
        return NextResponse.json({ error: 'Failed to save authenticator to DB.' }, { status: 500 });
      }

      await auth.supabase.from('webauthn_challenges').delete().eq('id', challengeData.id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Cryptographic Verification failed' }, { status: 400 });
  } catch (error: any) {
    console.error("Verification Parsing Error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
});
