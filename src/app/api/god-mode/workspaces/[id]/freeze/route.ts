export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { appendAuditLog } from '@/lib/audit-chain';
import { authorizeGodModeRequest, isSchemaUnavailable } from '@/lib/god-mode-api';

const UUID_PATTERN = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { context, response } = await authorizeGodModeRequest();
  if (response) return response;
  if (!context) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'A JSON request body is required' }, { status: 400 });
  }
  if (typeof body?.freeze !== 'boolean' || typeof body?.ghostMode !== 'boolean') {
    return NextResponse.json({ error: 'freeze and ghostMode must both be booleans' }, { status: 400 });
  }
  if (!params?.id || !UUID_PATTERN.test(params.id)) {
    return NextResponse.json({ error: 'A valid workspace ID is required' }, { status: 400 });
  }

  const { adminClient, actorId, identity } = context;
  try {
    const { data: company, error: companyError } = await adminClient
      .from('companies')
      .select('id, is_frozen')
      .eq('id', params.id)
      .maybeSingle();

    if (companyError) {
      if (isSchemaUnavailable(companyError)) {
        return NextResponse.json({ error: 'Workspace freeze is unavailable until the database schema is updated' }, { status: 503 });
      }
      console.error('Could not load workspace for God Mode freeze.', companyError);
      return NextResponse.json({ error: 'Unable to load workspace' }, { status: 500 });
    }
    if (!company) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });

    const previousState = company.is_frozen;
    const changed = previousState !== body.freeze;

    // WORM is deliberately written even when Ghost Mode is requested. This is a
    // write-ahead intervention record, so a successful state change is never unlogged.
    await appendAuditLog(adminClient, {
      companyId: params.id,
      wireId: null,
      actorId,
      action: 'SYSTEM_SUPPORT_INTERVENTION',
      eventPayload: {
        type: 'WORKSPACE_FREEZE_TOGGLED',
        workspace_id: params.id,
        previous_is_frozen: previousState,
        freeze: body.freeze,
        requested_is_frozen: body.freeze,
        operation_status: changed ? 'requested' : 'no_change',
        ghost_mode_requested: body.ghostMode,
        actor_email: identity.email,
      },
    });

    if (changed) {
      let update = adminClient
        .from('companies')
        .update({ is_frozen: body.freeze })
        .eq('id', params.id);
      update = previousState === null
        ? update.is('is_frozen', null)
        : update.eq('is_frozen', previousState);

      const { data: updatedCompany, error: updateError } = await update
        .select('id, is_frozen')
        .maybeSingle();

      if (updateError || !updatedCompany) {
        try {
          await appendAuditLog(adminClient, {
            companyId: params.id,
            wireId: null,
            actorId,
            action: 'SYSTEM_SUPPORT_INTERVENTION',
            eventPayload: {
              type: 'WORKSPACE_FREEZE_TOGGLE_FAILED',
              workspace_id: params.id,
              requested_is_frozen: body.freeze,
              failure_code: updateError?.code ?? 'CONCURRENT_CHANGE',
              ghost_mode_requested: body.ghostMode,
              actor_email: identity.email,
            },
          });
        } catch (failureAuditError) {
          console.error('Failed to append God Mode freeze failure record.', failureAuditError);
        }

        if (updateError && isSchemaUnavailable(updateError)) {
          return NextResponse.json({ error: 'Workspace freeze is unavailable until the database schema is updated' }, { status: 503 });
        }
        if (!updateError && !updatedCompany) {
          return NextResponse.json({ error: 'Workspace changed concurrently; reload and retry' }, { status: 409 });
        }
        console.error('God Mode workspace freeze update failed.', updateError);
        return NextResponse.json({ error: 'Unable to update workspace freeze state' }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      data: { id: params.id, is_frozen: body.freeze },
      auditLogged: true,
      ghostModeRequested: body.ghostMode,
      ghostModeSuppressed: false,
      message: body.ghostMode ? 'Ghost Mode does not suppress WORM audit logging.' : undefined,
    });
  } catch (error) {
    console.error('God Mode workspace freeze request failed.', error);
    return NextResponse.json({ error: 'Workspace freeze request failed' }, { status: 503 });
  }
}
