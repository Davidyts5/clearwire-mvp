export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { appendAuditLog } from '@/lib/audit-chain';
import { authorizeGodModeRequest, isSchemaUnavailable } from '@/lib/god-mode-api';

const UUID_PATTERN = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const WIRE_PAGE_SIZE = 1000;
// One year of minutes: a generous ceiling that still rejects nonsense input.
const MAX_INBOUND_DELAY_MINUTES = 525600;

type WorkspaceRecord = {
  id: string;
  name: string | null;
  is_frozen: boolean | null;
  inbound_delay_minutes: number | null;
};

async function loadWorkspace(adminClient: any, workspaceId: string) {
  const { data, error } = await adminClient
    .from('companies')
    .select('id, name, is_frozen, inbound_delay_minutes')
    .eq('id', workspaceId)
    .maybeSingle();

  return { workspace: data as WorkspaceRecord | null, error };
}

// Money summation without float drift: wire amounts are DECIMAL(12,2), so
// accumulate integer cents. Integer cents stay exact up to ~$90 trillion,
// far beyond any workspace wire volume.
function amountToCents(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const text = String(value).trim();
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(text);
  if (!match) return 0;
  const [, sign, whole, fraction = ''] = match;
  const cents = Number(whole) * 100 + Number((fraction + '00').slice(0, 2));
  return sign === '-' ? -cents : cents;
}

function centsToUsdString(totalCents: number): string {
  const rounded = Math.round(totalCents);
  const negative = rounded < 0;
  const absolute = Math.abs(rounded);
  const dollars = Math.floor(absolute / 100);
  const cents = (absolute % 100).toString().padStart(2, '0');
  return `${negative ? '-' : ''}${dollars.toString()}.${cents}`;
}

function schemaOrServerError(error: any, unavailableMessage: string, loadMessage: string, logLabel: string) {
  if (isSchemaUnavailable(error)) {
    return NextResponse.json({ error: unavailableMessage }, { status: 503 });
  }
  console.error(logLabel, error);
  return NextResponse.json({ error: loadMessage }, { status: 500 });
}

// Workspace drill-down: per-company wire stats plus the user/device list the
// Command Deck needs for support actions. This exposes tenant user and device
// metadata, so the inspection itself is recorded in the WORM ledger before
// the data is returned.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { context, response } = await authorizeGodModeRequest();
  if (response) return response;
  if (!context) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!params?.id || !UUID_PATTERN.test(params.id)) {
    return NextResponse.json({ error: 'A valid workspace ID is required' }, { status: 400 });
  }

  const { adminClient, actorId, identity } = context;
  try {
    const { workspace, error: workspaceError } = await loadWorkspace(adminClient, params.id);
    if (workspaceError) {
      return schemaOrServerError(
        workspaceError,
        'Workspace drill-down is unavailable until the database schema is updated',
        'Unable to load workspace',
        'Could not load workspace for God Mode drill-down.',
      );
    }
    if (!workspace) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });

    try {
      await appendAuditLog(adminClient, {
        companyId: workspace.id,
        wireId: null,
        actorId,
        action: 'SYSTEM_SUPPORT_INTERVENTION',
        eventPayload: {
          type: 'WORKSPACE_DRILLDOWN_VIEWED',
          workspace_id: workspace.id,
          actor_email: identity.email,
        },
      });
    } catch (auditError) {
      console.error('Could not log God Mode workspace drill-down.', auditError);
      return NextResponse.json({ error: 'Workspace drill-down could not be logged' }, { status: 503 });
    }

    // Total wire volume, paged exactly like the global telemetry in page.tsx
    // so large tenants are summed completely rather than truncated.
    let totalWireVolumeCents = 0;
    let wireCount = 0;
    let offset = 0;
    while (true) {
      const { data: wires, error: wiresError } = await adminClient
        .from('wire_requests')
        .select('amount')
        .eq('company_id', workspace.id)
        .order('id', { ascending: true })
        .range(offset, offset + WIRE_PAGE_SIZE - 1);

      if (wiresError) {
        return schemaOrServerError(
          wiresError,
          'Workspace drill-down is unavailable until the database schema is updated',
          'Unable to load workspace wires',
          'Could not load wires for God Mode drill-down.',
        );
      }

      const rows = wires ?? [];
      for (const row of rows) totalWireVolumeCents += amountToCents(row.amount);
      wireCount += rows.length;
      if (rows.length < WIRE_PAGE_SIZE) break;
      offset += WIRE_PAGE_SIZE;
    }

    const { count: frozenWireCount, error: frozenError } = await adminClient
      .from('wire_requests')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', workspace.id)
      .eq('status', 'frozen');

    if (frozenError) {
      return schemaOrServerError(
        frozenError,
        'Workspace drill-down is unavailable until the database schema is updated',
        'Unable to count frozen wires',
        'Could not count frozen wires for God Mode drill-down.',
      );
    }

    const { data: users, error: usersError } = await adminClient
      .from('users')
      .select('id, full_name, email, role, created_at')
      .eq('company_id', workspace.id)
      .order('full_name', { ascending: true });

    if (usersError) {
      return schemaOrServerError(
        usersError,
        'Workspace drill-down is unavailable until the database schema is updated',
        'Unable to load workspace users',
        'Could not load users for God Mode drill-down.',
      );
    }

    const userRows = users ?? [];
    let authenticators: any[] = [];
    if (userRows.length > 0) {
      const { data: devices, error: devicesError } = await adminClient
        .from('user_authenticators')
        .select('id, user_id, device_name, browser, os, form_factor, created_at, last_used_at')
        .in('user_id', userRows.map((user: any) => user.id))
        .order('created_at', { ascending: false });

      if (devicesError) {
        return schemaOrServerError(
          devicesError,
          'Workspace drill-down is unavailable until the database schema is updated',
          'Unable to load workspace user devices',
          'Could not load user authenticators for God Mode drill-down.',
        );
      }
      authenticators = devices ?? [];
    }

    const devicesByUser = new Map<string, any[]>();
    for (const device of authenticators) {
      const list = devicesByUser.get(device.user_id) ?? [];
      list.push(device);
      devicesByUser.set(device.user_id, list);
    }

    return NextResponse.json({
      success: true,
      data: {
        company: {
          id: workspace.id,
          name: workspace.name,
          is_frozen: workspace.is_frozen,
          inbound_delay_minutes: workspace.inbound_delay_minutes,
        },
        stats: {
          totalWireVolumeUsd: centsToUsdString(totalWireVolumeCents),
          totalWires: wireCount,
          frozenWires: frozenWireCount ?? 0,
        },
        users: userRows.map((user: any) => {
          const userAuthenticators = devicesByUser.get(user.id) ?? [];
          return {
            id: user.id,
            full_name: user.full_name,
            email: user.email,
            role: user.role,
            created_at: user.created_at,
            // deviceId is what POST /api/god-mode/users/[id]/revoke-device expects.
            deviceId: userAuthenticators[0]?.id ?? null,
            user_authenticators: userAuthenticators,
          };
        }),
      },
      auditLogged: true,
    });
  } catch (error) {
    console.error('God Mode workspace drill-down request failed.', error);
    return NextResponse.json({ error: 'Workspace drill-down request failed' }, { status: 503 });
  }
}

// Update the inbound quarantine delay for a workspace.
//
// Ghost Mode policy: ghostMode is accepted and recorded as a request marker
// (ghost_mode_requested), but it NEVER suppresses the WORM write. This mirrors
// the freeze and revoke-device endpoints, which return
// ghostModeSuppressed: false. The audit record is written ahead of the
// mutation so a successful delay change is never unlogged.
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

  if (
    typeof body?.inbound_delay_minutes !== 'number' ||
    !Number.isInteger(body.inbound_delay_minutes) ||
    body.inbound_delay_minutes < 0 ||
    body.inbound_delay_minutes > MAX_INBOUND_DELAY_MINUTES ||
    typeof body?.ghostMode !== 'boolean'
  ) {
    return NextResponse.json(
      { error: `inbound_delay_minutes must be an integer between 0 and ${MAX_INBOUND_DELAY_MINUTES}, and ghostMode must be a boolean` },
      { status: 400 },
    );
  }
  if (!params?.id || !UUID_PATTERN.test(params.id)) {
    return NextResponse.json({ error: 'A valid workspace ID is required' }, { status: 400 });
  }

  const { adminClient, actorId, identity } = context;
  try {
    const { workspace, error: workspaceError } = await loadWorkspace(adminClient, params.id);

    if (workspaceError) {
      return schemaOrServerError(
        workspaceError,
        'Workspace delay update is unavailable until the database schema is updated',
        'Unable to load workspace',
        'Could not load workspace for God Mode delay update.',
      );
    }
    if (!workspace) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });

    const previousDelay = workspace.inbound_delay_minutes;
    const newDelay = body.inbound_delay_minutes as number;
    const changed = previousDelay !== newDelay;

    // WORM is deliberately written even when Ghost Mode is requested. This is a
    // write-ahead intervention record, so a successful state change is never unlogged.
    await appendAuditLog(adminClient, {
      companyId: workspace.id,
      wireId: null,
      actorId,
      action: 'SYSTEM_SUPPORT_INTERVENTION',
      eventPayload: {
        type: 'WORKSPACE_DELAY_UPDATED',
        workspace_id: workspace.id,
        previous_inbound_delay_minutes: previousDelay,
        inbound_delay_minutes: newDelay,
        new_inbound_delay_minutes: newDelay,
        operation_status: changed ? 'requested' : 'no_change',
        ghost_mode_requested: body.ghostMode,
        actor_email: identity.email,
      },
    });

    if (changed) {
      let update = adminClient
        .from('companies')
        .update({ inbound_delay_minutes: newDelay })
        .eq('id', workspace.id);
      update = previousDelay === null
        ? update.is('inbound_delay_minutes', null)
        : update.eq('inbound_delay_minutes', previousDelay);

      const { data: updatedWorkspace, error: updateError } = await update
        .select('id, inbound_delay_minutes')
        .maybeSingle();

      if (updateError || !updatedWorkspace) {
        try {
          await appendAuditLog(adminClient, {
            companyId: workspace.id,
            wireId: null,
            actorId,
            action: 'SYSTEM_SUPPORT_INTERVENTION',
            eventPayload: {
              type: 'WORKSPACE_DELAY_UPDATE_FAILED',
              workspace_id: workspace.id,
              previous_inbound_delay_minutes: previousDelay,
              inbound_delay_minutes: newDelay,
              failure_code: updateError?.code ?? 'CONCURRENT_CHANGE',
              ghost_mode_requested: body.ghostMode,
              actor_email: identity.email,
            },
          });
        } catch (failureAuditError) {
          console.error('Failed to append God Mode delay failure record.', failureAuditError);
        }

        if (updateError && isSchemaUnavailable(updateError)) {
          return NextResponse.json({ error: 'Workspace delay update is unavailable until the database schema is updated' }, { status: 503 });
        }
        if (!updateError && !updatedWorkspace) {
          return NextResponse.json({ error: 'Workspace changed concurrently; reload and retry' }, { status: 409 });
        }
        console.error('God Mode workspace delay update failed.', updateError);
        return NextResponse.json({ error: 'Unable to update workspace delay' }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      data: { id: workspace.id, inbound_delay_minutes: newDelay },
      auditLogged: true,
      ghostModeRequested: body.ghostMode,
      ghostModeSuppressed: false,
      message: body.ghostMode ? 'Ghost Mode does not suppress WORM audit logging.' : undefined,
    });
  } catch (error) {
    console.error('God Mode workspace delay request failed.', error);
    return NextResponse.json({ error: 'Workspace delay request failed' }, { status: 503 });
  }
}
