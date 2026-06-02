import { NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { rpName, getRpId, getOrigin, uint8ArrayToBase64 } from '@/lib/webauthn';
import { withAuth } from '@/lib/api-auth';

export const POST = withAuth(['cfo'], async (req, ctx, auth) => {
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
      // FIX: @simplewebauthn/server v13 moved these properties inside a nested 'credential' object.
      // Older versions had them directly on registrationInfo. 
      const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
      const { publicKey, id: credentialID, counter } = credential;

      const { error: insertError } = await auth.supabase.from('user_authenticators').insert([{
        user_id: auth.userId,
        credential_id: credentialID, // Use the extracted FIDO ID
        credential_public_key: uint8ArrayToBase64(publicKey), // Now receives the actual Uint8Array instead of undefined
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
