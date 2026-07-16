export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { getRpId, getOrigin, base64ToUint8Array } from '@/lib/webauthn';
import crypto from 'crypto';
import { createNotification, NOTIFICATION_TYPES } from '@/lib/notifications';
import { withAuth, verifyTenantResource, verifySegregationOfDuties, getAdminClient } from '@/lib/api-auth';
import { ROLES } from '@/lib/roles';

export const POST = withAuth([ROLES.CONTROLLER, ROLES.CFO], async (req, { params }, auth) => {
  await verifyTenantResource(auth.supabase, 'wire_requests', params.id, auth.companyId);
  await verifySegregationOfDuties(auth.supabase, params.id, auth.userId);

  // FIX: Fetch the vendor_id and snapshots so the self-healing logic has the data it needs!
  const { data: wireData } = await auth.supabase
    .from('wire_requests')
    .select('amount, vendor_id, account_number_snapshot, swift_bic_snapshot')
    .eq('id', params.id)
    .single();
  
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

      
      // 1. ATOMIC STATE MACHINE (Multi-Sig Aware)
      const adminClient = await getAdminClient();

      // We need to fetch the company settings to know if this wire requires dual control
      const { data: settings } = await adminClient.from('company_settings').select('approval_tiers').eq('company_id', auth.companyId).single();
      
      let requiresSecondApproval = false;
      let requiresCFO = false;
      
      if (settings?.approval_tiers) {
        const tier1Max = settings.approval_tiers.tier1?.max || 10000;
        const tier2Max = settings.approval_tiers.tier2?.max || 100000;
        
        if (wireData.amount > tier2Max) {
          requiresCFO = true; // Way over the limit, CFO must explicitly sign
        } else if (wireData.amount > tier1Max) {
          requiresSecondApproval = true; // Over the single-controller limit, needs two independent controllers
        }
      }

      // If the current user IS the CFO, their signature trumps the requirements and instantly finalizes it.
      if (auth.role === ROLES.CFO) {
        requiresSecondApproval = false;
        requiresCFO = false;
      }

      const { data: updatedWire, error: rpcError } = await adminClient.rpc('transition_wire_state', {
        p_wire_id: params.id,
        p_new_status: 'approved',
        p_actor_id: auth.userId,
        p_crypto_hash: `0x${fidoSignatureHash}`,
        p_requires_second_approval: requiresSecondApproval,
        p_requires_cfo_approval: requiresCFO
      });

      if (rpcError) throw new Error(rpcError.message);

      // 2. SELF-HEALING VENDOR MASTER DATA
      // FIX: Use adminClient to bypass any potential RLS restrictions when updating the vendor table
      if (wireData.vendor_id && wireData.account_number_snapshot) {
        const { data: vendorData } = await adminClient
          .from('vendors')
          .select('account_number, swift_bic')
          .eq('id', wireData.vendor_id)
          .single();

        if (vendorData && (vendorData.account_number !== wireData.account_number_snapshot || vendorData.swift_bic !== wireData.swift_bic_snapshot)) {
          await adminClient.from('vendors').update({
            account_number: wireData.account_number_snapshot,
            swift_bic: wireData.swift_bic_snapshot
          }).eq('id', wireData.vendor_id);

          await adminClient.from('audit_logs').insert([{
            company_id: auth.companyId,
            wire_id: params.id,
            actor_id: auth.userId,
            action: 'VENDOR_MASTER_UPDATED',
            new_hash: `0x${fidoSignatureHash}`
          }]);
        }
      }

      return NextResponse.json({ success: true, data: updatedWire });
    }

    return NextResponse.json({ error: 'Cryptographic Verification Failed' }, { status: 400 });
  } catch (error: any) {
    console.error("Authentication Verification Error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
});
