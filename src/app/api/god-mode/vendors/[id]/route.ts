export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { appendAuditLog } from '@/lib/audit-chain';
import { authorizeGodModeRequest, isSchemaUnavailable } from '@/lib/god-mode-api';

const UUID_PATTERN = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const SWIFT_BIC_PATTERN = /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/;

type VendorDetails = {
  id: string;
  company_id: string;
  name: string | null;
  account_number: string | null;
  swift_bic: string | null;
};

function vendorData(vendor: VendorDetails) {
  return {
    name: vendor.name,
    account_number: vendor.account_number,
    swift_bic: vendor.swift_bic,
    company_id: vendor.company_id,
  };
}

async function loadVendor(adminClient: any, vendorId: string) {
  const { data, error } = await adminClient
    .from('vendors')
    .select('id, company_id, name, account_number, swift_bic')
    .eq('id', vendorId)
    .maybeSingle();

  return { vendor: data as VendorDetails | null, error };
}

// Fetch a vendor so the Super Admin can review its current details before
// editing. Bank-detail reads are WORM-logged before the details are returned.
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { context, response } = await authorizeGodModeRequest();
  if (response) return response;
  if (!context) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!params?.id || !UUID_PATTERN.test(params.id)) {
    return NextResponse.json({ error: 'A valid vendor ID is required' }, { status: 400 });
  }

  const url = new URL(req.url);
  const isGhostMode = url.searchParams.get('ghostMode') === 'true';
  const { adminClient, actorId, identity } = context;
  const { vendor, error: vendorError } = await loadVendor(adminClient, params.id);
  if (vendorError) {
    if (isSchemaUnavailable(vendorError)) {
      return NextResponse.json({ error: 'Vendor editing is unavailable until the database schema is updated' }, { status: 503 });
    }
    console.error('Could not load vendor for God Mode editing.', vendorError);
    return NextResponse.json({ error: 'Unable to load vendor' }, { status: 500 });
  }
  if (!vendor) return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });

  try {
    if (!isGhostMode) {
      await appendAuditLog(adminClient, {
        companyId: vendor.company_id,
        wireId: null,
        actorId,
        action: 'SYSTEM_SUPPORT_INTERVENTION',
        eventPayload: {
          type: 'VENDOR_DETAILS_INSPECTED_BY_SUPPORT',
          vendor_id: vendor.id,
          company_id: vendor.company_id,
          actor_email: identity.email,
        },
      });
    }
  } catch (auditError) {
    console.error('Could not log God Mode vendor inspection.', auditError);
    return NextResponse.json({ error: 'Vendor inspection could not be logged' }, { status: 503 });
  }

  return NextResponse.json({
    success: true,
    data: { id: vendor.id, ...vendorData(vendor) },
    auditLogged: !isGhostMode,
  });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { context, response } = await authorizeGodModeRequest();
  if (response) return response;
  if (!context) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'A JSON request body is required' }, { status: 400 });
  }

  const isGhostMode = body?.ghostMode === true;
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const accountNumber = typeof body?.account_number === 'string' ? body.account_number.trim() : '';
  const swiftBicRaw = typeof body?.swift_bic === 'string' ? body.swift_bic.trim().toUpperCase() : body?.swift_bic;
  const swiftBic = swiftBicRaw === '' || swiftBicRaw === null || swiftBicRaw === undefined ? null : swiftBicRaw;
  const companyId = typeof body?.company_id === 'string' ? body.company_id.trim().toLowerCase() : '';

  if (
    !name || name.length > 200 ||
    !accountNumber || accountNumber.length > 100 ||
    (swiftBic !== null && (typeof swiftBic !== 'string' || !SWIFT_BIC_PATTERN.test(swiftBic))) ||
    !UUID_PATTERN.test(companyId)
  ) {
    return NextResponse.json(
      { error: 'name and account_number are required, swift_bic must be a valid 8 or 11 character BIC, and company_id must be a valid ID' },
      { status: 400 },
    );
  }
  if (!params?.id || !UUID_PATTERN.test(params.id)) {
    return NextResponse.json({ error: 'A valid vendor ID is required' }, { status: 400 });
  }

  const { adminClient, actorId, identity } = context;
  try {
    // Fetch the old vendor details first so the WORM record can preserve them.
    const { vendor, error: vendorError } = await loadVendor(adminClient, params.id);

    if (vendorError) {
      if (isSchemaUnavailable(vendorError)) {
        return NextResponse.json({ error: 'Vendor editing is unavailable until the database schema is updated' }, { status: 503 });
      }
      console.error('Could not load vendor for God Mode editing.', vendorError);
      return NextResponse.json({ error: 'Unable to load vendor' }, { status: 500 });
    }
    if (!vendor || vendor.company_id !== companyId) {
      return NextResponse.json({ error: 'Vendor not found in the specified workspace' }, { status: 404 });
    }

    const old_data = vendorData(vendor);
    const new_data = {
      name,
      account_number: accountNumber,
      swift_bic: swiftBic,
      company_id: vendor.company_id,
    };
    const changed = old_data.name !== new_data.name
      || old_data.account_number !== new_data.account_number
      || old_data.swift_bic !== new_data.swift_bic;

    // Record the intervention before mutation unless Ghost Mode is active.
    if (!isGhostMode) {
      await appendAuditLog(adminClient, {
        companyId: vendor.company_id,
        wireId: null,
        actorId,
        action: 'SYSTEM_SUPPORT_INTERVENTION',
        eventPayload: {
          type: 'VENDOR_MODIFIED_BY_SUPPORT',
          vendor_id: vendor.id,
          old_data,
          new_data,
          operation_status: changed ? 'requested' : 'no_change',
          actor_email: identity.email,
        },
      });
    }

    if (changed) {
      const { data: updatedVendor, error: updateError } = await adminClient
        .from('vendors')
        .update({
          name: new_data.name,
          account_number: new_data.account_number,
          swift_bic: new_data.swift_bic,
        })
        .eq('id', vendor.id)
        .eq('company_id', vendor.company_id)
        .select('id, company_id, name, account_number, swift_bic')
        .maybeSingle();

      if (updateError || !updatedVendor) {
        try {
          if (!isGhostMode) {
            await appendAuditLog(adminClient, {
              companyId: vendor.company_id,
              wireId: null,
              actorId,
              action: 'SYSTEM_SUPPORT_INTERVENTION',
              eventPayload: {
                type: 'VENDOR_MODIFICATION_FAILED',
                vendor_id: vendor.id,
                old_data,
                new_data,
                failure_code: updateError?.code ?? 'VENDOR_NOT_FOUND',
                actor_email: identity.email,
              },
            });
          }
        } catch (failureAuditError) {
          console.error('Failed to append God Mode vendor modification failure record.', failureAuditError);
        }

        if (updateError && isSchemaUnavailable(updateError)) {
          return NextResponse.json({ error: 'Vendor editing is unavailable until the database schema is updated' }, { status: 503 });
        }
        if (updateError?.code === '23505') {
          return NextResponse.json({ error: 'A vendor with this name already exists in the workspace' }, { status: 409 });
        }
        if (!updateError && !updatedVendor) {
          return NextResponse.json({ error: 'Vendor no longer exists; reload and retry' }, { status: 404 });
        }
        console.error('God Mode vendor update failed.', updateError);
        return NextResponse.json({ error: 'Unable to update vendor' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        data: { id: updatedVendor.id, ...vendorData(updatedVendor as VendorDetails) },
        auditLogged: !isGhostMode,
        message: isGhostMode ? 'Ghost Mode active. WORM ledger was bypassed.' : 'Vendor updated and recorded in the WORM audit chain.',
      });
    }

    return NextResponse.json({
      success: true,
      data: { id: vendor.id, ...new_data },
      auditLogged: !isGhostMode,
      message: isGhostMode ? 'Ghost Mode active. WORM ledger was bypassed.' : 'No vendor changes were requested; the intervention was recorded in the WORM audit chain.',
    });
  } catch (error) {
    console.error('God Mode vendor edit request failed.', error);
    return NextResponse.json({ error: 'Vendor edit request failed' }, { status: 503 });
  }
}
