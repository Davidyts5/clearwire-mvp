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
  if (
    typeof body?.deviceId !== 'string' || !UUID_PATTERN.test(body.deviceId.trim()) ||
    typeof body?.ghostMode !== 'boolean' ||
    typeof body?.companyId !== 'string' || !UUID_PATTERN.test(body.companyId.trim())
  ) {
    return NextResponse.json({ error: 'deviceId and companyId must be valid IDs, and ghostMode must be a boolean' }, { status: 400 });
  }
  if (!params?.id || !UUID_PATTERN.test(params.id)) {
    return NextResponse.json({ error: 'A valid user ID is required' }, { status: 400 });
  }

  const targetCompanyId = body.companyId.trim().toLowerCase();
  const requestedDeviceId = body.deviceId.trim();
  const { adminClient, actorId, identity } = context;
  try {
    const { data: targetUser, error: userError } = await adminClient
      .from('users')
      .select('id, company_id')
      .eq('id', params.id)
      .maybeSingle();

    if (userError) {
      console.error('Could not load target user for God Mode device revocation.', userError);
      return NextResponse.json({ error: 'Unable to verify target user' }, { status: 500 });
    }
    if (!targetUser || targetUser.company_id !== targetCompanyId) {
      return NextResponse.json({ error: 'User not found in the specified workspace' }, { status: 404 });
    }

    const { data: device, error: deviceError } = await adminClient
      .from('user_authenticators')
      .select('id, user_id')
      .eq('id', requestedDeviceId)
      .eq('user_id', params.id)
      .maybeSingle();

    if (deviceError) {
      if (isSchemaUnavailable(deviceError)) {
        return NextResponse.json({ error: 'Device revocation is unavailable until the database schema is updated' }, { status: 503 });
      }
      console.error('Could not load target authenticator for God Mode revocation.', deviceError);
      return NextResponse.json({ error: 'Unable to verify target device' }, { status: 500 });
    }
    if (!device) return NextResponse.json({ error: 'Device not found for this user' }, { status: 404 });

    // WORM is deliberately written even when Ghost Mode is requested. This is a
    // write-ahead intervention record, so a successful deletion is never unlogged.
    await appendAuditLog(adminClient, {
      companyId: targetUser.company_id,
      wireId: null,
      actorId,
      action: 'SYSTEM_SUPPORT_INTERVENTION',
      eventPayload: {
        type: 'DEVICE_REVOKED_BY_SUPPORT',
        device_id: device.id,
        user_id: targetUser.id,
        company_id: targetUser.company_id,
        operation_status: 'requested',
        ghost_mode_requested: body.ghostMode,
        actor_email: identity.email,
      },
    });

    const { data: deletedDevice, error: deleteError } = await adminClient
      .from('user_authenticators')
      .delete()
      .eq('id', device.id)
      .eq('user_id', targetUser.id)
      .select('id')
      .maybeSingle();

    if (deleteError || !deletedDevice) {
      try {
        await appendAuditLog(adminClient, {
          companyId: targetUser.company_id,
          wireId: null,
          actorId,
          action: 'SYSTEM_SUPPORT_INTERVENTION',
          eventPayload: {
            type: 'DEVICE_REVOCATION_FAILED',
            device_id: device.id,
            user_id: targetUser.id,
            failure_code: deleteError?.code ?? 'DEVICE_NOT_FOUND',
            ghost_mode_requested: body.ghostMode,
            actor_email: identity.email,
          },
        });
      } catch (failureAuditError) {
        console.error('Failed to append God Mode device revocation failure record.', failureAuditError);
      }

      if (deleteError && isSchemaUnavailable(deleteError)) {
        return NextResponse.json({ error: 'Device revocation is unavailable until the database schema is updated' }, { status: 503 });
      }
      if (!deleteError && !deletedDevice) {
        return NextResponse.json({ error: 'Device no longer exists; refresh and retry' }, { status: 404 });
      }
      console.error('God Mode device revocation failed.', deleteError);
      return NextResponse.json({ error: 'Unable to revoke device' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: { deviceId: deletedDevice.id, userId: targetUser.id, companyId: targetUser.company_id },
      auditLogged: true,
      ghostModeRequested: body.ghostMode,
      ghostModeSuppressed: false,
      message: body.ghostMode ? 'Ghost Mode does not suppress WORM audit logging.' : undefined,
    });
  } catch (error) {
    console.error('God Mode device revocation request failed.', error);
    return NextResponse.json({ error: 'Device revocation request failed' }, { status: 503 });
  }
}
