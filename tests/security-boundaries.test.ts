import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NextResponse } from 'next/server';
import { ROLES } from '../src/lib/roles';
import { loadSource } from './helpers/load-source';

const req = () => new Request('https://example.invalid/api?companyId=attacker&role=cfo', {
  headers: { 'x-company-id': 'attacker', 'x-role': 'cfo' },
});

function authModule({ user = { id: 'user-1' } as any, authError = null as any, profile = { company_id: 'tenant-1', role: ROLES.CFO } as any, profileError = null as any } = {}): Record<string, any> & { queries: unknown[][] } {
  const queries: unknown[][] = [];
  const client = {
    auth: { async getUser() { return { data: { user }, error: authError }; } },
    from(table: string) {
      queries.push(['from', table]);
      const query = {
        select() { return query; },
        eq(...args: unknown[]) { queries.push(['eq', ...args]); return query; },
        async single() { return { data: profile, error: profileError }; },
      };
      return query;
    },
  };
  return { ...loadSource('src/lib/api-auth.ts', { '@/lib/supabase/server': { createClient: () => client } }), queries };
}

for (const [name, options, status] of [
  ['missing session', { user: null }, 401],
  ['invalid session', { authError: { message: 'invalid token' } }, 401],
  ['missing tenant', { profile: { role: ROLES.CFO } }, 403],
  ['profile lookup failure', { profileError: { message: 'database unavailable' } }, 403],
  ['clerk attempting CFO endpoint', { profile: { company_id: 'tenant-1', role: ROLES.CLERK } }, 403],
  ['unknown role', { profile: { company_id: 'tenant-1', role: 'superuser' } }, 403],
] as const) {
  test(`withAuth denies ${name} before executing handler`, async () => {
    const { withAuth } = authModule(options);
    let calls = 0;
    const response = await withAuth([ROLES.CFO], () => { calls++; return NextResponse.json({ success: true }); })(req(), {});
    assert.equal(response.status, status);
    assert.equal(calls, 0);
  });
}

test('withAuth derives identity, role and tenant from server-verified user/profile, not client headers or query', async () => {
  const { withAuth, queries } = authModule();
  const response = await withAuth([ROLES.CFO], (_request: Request, _ctx: unknown, auth: any) =>
    NextResponse.json({ userId: auth.userId, companyId: auth.companyId, role: auth.role })
  )(req(), {});
  assert.deepEqual(await response.json(), { userId: 'user-1', companyId: 'tenant-1', role: 'cfo' });
  assert.ok(queries.some((q: unknown[]) => q[0] === 'eq' && q[1] === 'id' && q[2] === 'user-1'));
});

function resourceClient(row: unknown, error: unknown = null) {
  const query = { select() { return query; }, eq() { return query; }, async single() { return { data: row, error }; } };
  return { from() { return query; } };
}

test('tenant-resource verification rejects cross-tenant and missing resources', async () => {
  const { verifyTenantResource } = authModule();
  await assert.rejects(verifyTenantResource(resourceClient({ company_id: 'tenant-2' }), 'wire_requests', 'wire-1', 'tenant-1'), /Tenant isolation violation/);
  await assert.rejects(verifyTenantResource(resourceClient(null), 'wire_requests', 'wire-1', 'tenant-1'), /not found/);
  await assert.rejects(verifyTenantResource(resourceClient(null, { message: 'failed' }), 'wire_requests', 'wire-1', 'tenant-1'));
  assert.equal((await verifyTenantResource(resourceClient({ company_id: 'tenant-1' }), 'wire_requests', 'wire-1', 'tenant-1')).company_id, 'tenant-1');
});

test('segregation of duties denies self-approval and fails closed on missing records', async () => {
  const { verifySegregationOfDuties } = authModule();
  await assert.rejects(verifySegregationOfDuties(resourceClient({ clerk_id: 'user-1' }), 'wire-1', 'user-1'), /SOD_VIOLATION/);
  await assert.rejects(verifySegregationOfDuties(resourceClient(null), 'wire-1', 'user-1'));
  assert.equal(await verifySegregationOfDuties(resourceClient({ clerk_id: 'user-2' }), 'wire-1', 'user-1'), true);
});

for (const [name, allowlist, user, authError] of [
  ['empty allowlist', '', { id: 'u1', email: 'admin@example.invalid' }, null],
  ['missing session', 'admin@example.invalid', null, null],
  ['non-allowlisted user', 'admin@example.invalid', { id: 'u1', email: 'other@example.invalid' }, null],
  ['unverified session response', 'admin@example.invalid', { id: 'u1', email: 'admin@example.invalid' }, { message: 'invalid' }],
  ['missing identity', 'admin@example.invalid', { email: 'admin@example.invalid' }, null],
] as const) {
  test(`Super Admin allowlist denies ${name}`, async () => {
    const subject = loadSource('src/lib/god-mode-auth.ts', {
      '@/lib/supabase/server': { createClient() { return { auth: { async getUser() { return { data: { user }, error: authError }; } } }; } },
    }, { CLEARWIRE_SUPER_ADMIN_EMAILS: allowlist });
    assert.equal(await subject.getGodModeUser(), null);
  });
}

test('Super Admin allowlist handles whitespace/case and uses getUser, not client session claims', async () => {
  const subject = loadSource('src/lib/god-mode-auth.ts', {
    '@/lib/supabase/server': { createClient() { return { auth: { async getUser() { return { data: { user: { id: 'u1', email: 'ADMIN@example.invalid' } }, error: null }; } } }; } },
  }, { CLEARWIRE_SUPER_ADMIN_EMAILS: ' other@example.invalid, admin@example.invalid ' });
  assert.equal((await subject.getGodModeUser()).id, 'u1');
});

test('Super Admin auth fails closed on provider/configuration exceptions', async () => {
  const subject = loadSource('src/lib/god-mode-auth.ts', {
    '@/lib/supabase/server': { createClient() { throw new Error('provider unavailable'); } },
  }, { CLEARWIRE_SUPER_ADMIN_EMAILS: 'admin@example.invalid' });
  assert.equal(await subject.getGodModeUser(), null);
});

for (const scenario of ['unauthorized', 'service-unavailable', 'missing-actor', 'actor-query-failed', 'authorized']) {
  test(`God Mode authorization: ${scenario}`, async () => {
    let adminClientCalls = 0;
    const subject = loadSource('src/lib/god-mode-api.ts', {
      '@/lib/god-mode-auth': { async getGodModeUser() { return scenario === 'unauthorized' ? null : { id: 'u1', email: 'admin@example.invalid' }; } },
      '@/lib/api-auth': { async getAdminClient() {
        adminClientCalls++;
        if (scenario === 'service-unavailable') throw new Error('missing service client');
        const query = { select() { return query; }, eq() { return query; }, async maybeSingle() {
          return { data: scenario === 'missing-actor' ? null : { id: 'u1' }, error: scenario === 'actor-query-failed' ? { message: 'failed' } : null };
        } };
        return { from() { return query; } };
      } },
    });
    const result = await subject.authorizeGodModeRequest();
    if (scenario === 'authorized') assert.equal(result.context.actorId, 'u1');
    else {
      assert.equal(result.context, undefined);
      assert.equal(result.response.status, scenario === 'unauthorized' ? 404 : scenario === 'missing-actor' ? 403 : 503);
    }
    assert.equal(adminClientCalls, scenario === 'unauthorized' ? 0 : 1);
  });
}

for (const [secret, authorization, status] of [
  [undefined, null, 401],
  [undefined, 'Bearer undefined', 401],
  ['', 'Bearer ', 401],
  ['test-cron-secret', 'Bearer wrong', 401],
  ['test-cron-secret', 'Bearer test-cron-secret', 200],
] as const) {
  test(`cron authorization secret=${secret === undefined ? 'missing' : secret === '' ? 'empty' : 'configured'}, header=${authorization === null ? 'missing' : authorization === 'Bearer undefined' ? 'undefined literal' : authorization === 'Bearer ' ? 'empty' : authorization.endsWith('wrong') ? 'wrong' : 'correct'}`, async () => {
    let privilegedCalls = 0;
    const route = loadSource('src/app/api/cron/reminders/route.ts', {
      '@/lib/api-auth': { async getAdminClient() {
        privilegedCalls++;
        const query = { select() { return query; }, in() { return query; }, async lte() { return { data: [], error: null }; } };
        return { from() { return query; } };
      } },
      '@/lib/notifications': { createNotification() { throw new Error('Unexpected notification'); }, NOTIFICATION_TYPES: {} },
      '@/lib/roles': { ROLES },
    }, { CRON_SECRET: secret });
    const response = await route.GET(new Request('https://example.invalid/api/cron/reminders', { headers: authorization === null ? {} : { authorization } }));
    assert.equal(response.status, status);
    assert.equal(privilegedCalls, status === 200 ? 1 : 0);
  });
}
