import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/api-auth';
import { getGodModeUser, type GodModeIdentity } from '@/lib/god-mode-auth';

export type GodModeRequestContext = {
  identity: GodModeIdentity;
  actorId: string;
  adminClient: Awaited<ReturnType<typeof getAdminClient>>;
};

export async function authorizeGodModeRequest(): Promise<{
  context?: GodModeRequestContext;
  response?: NextResponse;
}> {
  // Resolve the allowlist and session before creating the service-role client.
  const identity = await getGodModeUser();
  if (!identity) {
    return { response: NextResponse.json({ error: 'Not found' }, { status: 404 }) };
  }

  let adminClient: Awaited<ReturnType<typeof getAdminClient>>;
  try {
    adminClient = await getAdminClient();
  } catch (error) {
    console.error('God Mode service client is unavailable.', error);
    return { response: NextResponse.json({ error: 'God Mode service is unavailable' }, { status: 503 }) };
  }

  // audit_logs.actor_id references users(id); never substitute or fabricate an actor.
  const { data: actor, error: actorError } = await adminClient
    .from('users')
    .select('id')
    .eq('id', identity.id)
    .maybeSingle();

  if (actorError) {
    console.error('Could not resolve the Super Admin audit actor.', actorError);
    return { response: NextResponse.json({ error: 'Unable to resolve the audit actor' }, { status: 503 }) };
  }
  if (!actor) {
    return {
      response: NextResponse.json(
        { error: 'This Super Admin identity must be linked to a ClearWire audit actor before support actions are enabled.' },
        { status: 403 },
      ),
    };
  }

  return { context: { identity, actorId: actor.id, adminClient } };
}

export function isSchemaUnavailable(error: { code?: string } | null | undefined): boolean {
  return Boolean(error && ['42703', '42P01', 'PGRST204', 'PGRST205'].includes(error.code ?? ''));
}
