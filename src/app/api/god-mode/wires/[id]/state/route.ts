export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { appendAuditLog } from '@/lib/audit-chain';
import { authorizeGodModeRequest, isSchemaUnavailable } from '@/lib/god-mode-api';

const UUID_PATTERN = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const ALLOWED_STATUSES = ['pending_cfo', 'approved', 'rejected', 'frozen', 'denied'] as const;
type WireStatusOverride = (typeof ALLOWED_STATUSES)[number];

type WireStateTarget = {
  id: string;
  company_id: string;
  status: string;
};

async function loadWire(adminClient: any, wireId: string) {
  const { data, error } = await adminClient
    .from('wire_requests')
    .select('id, company_id, status')
    .eq('id', wireId)
    .maybeSingle();

  return { wire: data as WireStateTarget | null, error };
}

// Fetch a wire's current state so the Super Admin can confirm the override
// target before forcing a transition. The read is logged unless Ghost Mode is active.
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { context, response } = await authorizeGodModeRequest();
  if (response) return response;
  if (!context) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!params?.id || !UUID_PATTERN.test(params.id)) {
    return NextResponse.json({ error: 'A valid wire ID is required' }, { status: 400 });
  }

  const url = new URL(req.url);
  const isGhostMode = url.searchParams.get('ghostMode') === 'true';
  const { adminClient, actorId, identity } = context;
  const { wire, error: wireError } = await loadWire(adminClient, params.id);
  if (wireError) {
    if (isSchemaUnavailable(wireError)) {
      return NextResponse.json({ error: 'Wire state override is unavailable until the database schema is updated' }, { status: 503 });
    }
    console.error('Could not load wire for God Mode state override.', wireError);
    return NextResponse.json({ error: 'Unable to load wire' }, { status: 500 });
  }
  if (!wire) return NextResponse.json({ error: 'Wire not found' }, { status: 404 });

  try {
    if (!isGhostMode) {
      await appendAuditLog(adminClient, {
        companyId: wire.company_id,
        wireId: wire.id,
        actorId,
        action: 'SYSTEM_SUPPORT_INTERVENTION',
        eventPayload: {
          type: 'WIRE_STATE_INSPECTED_BY_SUPPORT',
          wire_id: wire.id,
          previous_status: wire.status,
          actor_email: identity.email,
        },
      });
    }
  } catch (auditError) {
    console.error('Could not log God Mode wire state inspection.', auditError);
    return NextResponse.json({ error: 'Wire inspection could not be logged' }, { status: 503 });
  }

  return NextResponse.json({
    success: true,
    data: { id: wire.id, company_id: wire.company_id, status: wire.status },
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
  const status = typeof body?.status === 'string' ? body.status.trim() : '';
  const companyId = typeof body?.company_id === 'string' ? body.company_id.trim().toLowerCase() : '';

  if (!ALLOWED_STATUSES.includes(status as WireStatusOverride) || !UUID_PATTERN.test(companyId)) {
    return NextResponse.json(
      { error: `status must be one of ${ALLOWED_STATUSES.join(', ')}, and company_id must be a valid ID` },
      { status: 400 },
    );
  }
  if (!params?.id || !UUID_PATTERN.test(params.id)) {
    return NextResponse.json({ error: 'A valid wire ID is required' }, { status: 400 });
  }

  const new_status = status as WireStatusOverride;
  const { adminClient, actorId, identity } = context;
  try {
    const { wire, error: wireError } = await loadWire(adminClient, params.id);

    if (wireError) {
      if (isSchemaUnavailable(wireError)) {
        return NextResponse.json({ error: 'Wire state override is unavailable until the database schema is updated' }, { status: 503 });
      }
      console.error('Could not load wire for God Mode state override.', wireError);
      return NextResponse.json({ error: 'Unable to load wire' }, { status: 500 });
    }
    if (!wire || wire.company_id !== companyId) {
      return NextResponse.json({ error: 'Wire not found in the specified workspace' }, { status: 404 });
    }

    const previous_status = wire.status;
    const changed = previous_status !== new_status;

    // Record the intervention before mutation unless Ghost Mode is active.
    if (!isGhostMode) {
      await appendAuditLog(adminClient, {
        companyId: wire.company_id,
        wireId: wire.id,
        actorId,
        action: 'SYSTEM_SUPPORT_INTERVENTION',
        eventPayload: {
          type: 'WIRE_STATE_FORCED_BY_SUPPORT',
          wire_id: wire.id,
          previous_status,
          new_status,
          operation_status: changed ? 'requested' : 'no_change',
          actor_email: identity.email,
        },
      });
    }

    if (changed) {
      const { data: updatedWire, error: updateError } = await adminClient
        .from('wire_requests')
        .update({ status: new_status })
        .eq('id', wire.id)
        .eq('company_id', wire.company_id)
        .eq('status', previous_status)
        .select('id, company_id, status')
        .maybeSingle();

      if (updateError || !updatedWire) {
        try {
          if (!isGhostMode) {
            await appendAuditLog(adminClient, {
              companyId: wire.company_id,
              wireId: wire.id,
              actorId,
              action: 'SYSTEM_SUPPORT_INTERVENTION',
              eventPayload: {
                type: 'WIRE_STATE_FORCE_FAILED',
                wire_id: wire.id,
                previous_status,
                new_status,
                failure_code: updateError?.code ?? 'CONCURRENT_CHANGE',
                actor_email: identity.email,
              },
            });
          }
        } catch (failureAuditError) {
          console.error('Failed to append God Mode wire state failure record.', failureAuditError);
        }

        if (updateError && isSchemaUnavailable(updateError)) {
          return NextResponse.json({ error: 'Wire state override is unavailable until the database schema is updated' }, { status: 503 });
        }
        if (!updateError && !updatedWire) {
          return NextResponse.json({ error: 'Wire changed concurrently; reload and retry' }, { status: 409 });
        }
        console.error('God Mode wire state update failed.', updateError);
        return NextResponse.json({ error: 'Unable to update wire state' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        data: { id: updatedWire.id, company_id: updatedWire.company_id, status: updatedWire.status, previous_status },
        auditLogged: !isGhostMode,
        message: isGhostMode ? 'Ghost Mode active. WORM ledger was bypassed.' : 'Wire state forced and recorded in the WORM audit chain.',
      });
    }

    return NextResponse.json({
      success: true,
      data: { id: wire.id, company_id: wire.company_id, status: new_status, previous_status },
      auditLogged: !isGhostMode,
      message: isGhostMode ? 'Ghost Mode active. WORM ledger was bypassed.' : 'Wire was already in the requested state; the intervention was recorded in the WORM audit chain.',
    });
  } catch (error) {
    console.error('God Mode wire state request failed.', error);
    return NextResponse.json({ error: 'Wire state request failed' }, { status: 503 });
  }
}
