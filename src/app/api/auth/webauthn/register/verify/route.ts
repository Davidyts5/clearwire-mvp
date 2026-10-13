export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { rpName, getRpId, getOrigin, uint8ArrayToBase64 } from '@/lib/webauthn';
import { withAuth, getAdminClient } from '@/lib/api-auth';
import { ROLES } from '@/lib/roles';
import { UAParser } from 'ua-parser-js';
import { appendAuditLog } from '@/lib/audit-chain';

export const POST = withAuth([ROLES.CFO, ROLES.CONTROLLER], async (req, ctx, auth) => {
  const rawBody = await req.json();
  // Handle both old and new payload structures securely
  const body = rawBody.response ? rawBody.response : rawBody;
  const metadata = rawBody.metadata || null;

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

      // Parse the HTTP User-Agent on the server. Client hints remain supplemental metadata,
      // not an authentication or security signal.
      const userAgent = req.headers.get('user-agent') || '';
      const uaResult = new UAParser(userAgent).getResult();
      const clientBrowser = typeof metadata?.browser === 'string' ? metadata.browser.slice(0, 100) : '';
      const clientOs = typeof metadata?.os === 'string' ? metadata.os.slice(0, 100) : '';
      const browserName = uaResult.browser.name || clientBrowser || 'Unknown Browser';
      const browserVersion = uaResult.browser.major || '';
      const browser = browserVersion ? `${browserName} ${browserVersion}` : browserName;
      const os = uaResult.os.name || clientOs || 'Unknown Device';
      const parsedFormFactor = uaResult.device.type === 'mobile'
        ? 'Mobile'
        : uaResult.device.type === 'tablet'
          ? 'Tablet'
          : 'Desktop';
      const clientFormFactor = ['Mobile', 'Tablet', 'Desktop', 'SmartTV'].includes(metadata?.formFactor)
        ? metadata.formFactor
        : null;
      const formFactor = parsedFormFactor === 'Desktop' && clientFormFactor ? clientFormFactor : parsedFormFactor;

      // Capture server-provided Geo Location
      // Vercel injects location headers automatically if you use the edge network.
      // We fall back to standard reverse proxy headers for self-hosting.
      const countryHeader = req.headers.get('x-vercel-ip-country') || req.headers.get('x-real-ip-country');
      const registeredLocation = countryHeader?.trim().slice(0, 8).toUpperCase() || null;

      const adminClient = await getAdminClient();
      const { data: registeredDevice, error: insertError } = await adminClient.from('user_authenticators').insert([{
        user_id: auth.userId,
        credential_id: credentialID,
        credential_public_key: uint8ArrayToBase64(publicKey),
        counter: counter,
        credential_device_type: credentialDeviceType,
        credential_backed_up: credentialBackedUp,
        transports: body.response.transports || [],
        device_name: `${browser} on ${os}`.slice(0, 160),
        browser,
        os,
        form_factor: formFactor,
        registered_location: registeredLocation,
      }]).select('id, device_name, browser, os, form_factor, registered_location').single();

      if (insertError) {
        console.error("Insert Authenticator Error:", insertError);
        return NextResponse.json({ error: 'Failed to save authenticator to DB.' }, { status: 500 });
      }

      await appendAuditLog(adminClient, {
        companyId: auth.companyId,
        wireId: null,
        actorId: auth.userId,
        action: 'PASSKEY_DEVICE_REGISTERED',
        eventPayload: {
          device_id: registeredDevice.id,
          device_name: registeredDevice.device_name,
          browser: registeredDevice.browser,
          os: registeredDevice.os,
          form_factor: registeredDevice.form_factor,
          registered_location: registeredDevice.registered_location,
        },
      });

      await adminClient.from('webauthn_challenges').delete().eq('id', challengeData.id).eq('user_id', auth.userId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Cryptographic Verification failed' }, { status: 400 });
  } catch (error: any) {
    console.error("Verification Parsing Error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
});
