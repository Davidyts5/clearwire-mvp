import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import * as crypto from 'node:crypto';
import ts from 'typescript';
import { NextResponse } from 'next/server';
import { ROLES } from '../src/lib/roles';
import * as exceptions from '../src/lib/compliance-exceptions';
import { loadSource } from './helpers/load-source';

// Transpile the real route and substitute only external auth/storage/database dependencies.
function loadRoute(path: string, dependencies: Record<string, unknown>) {
  const output = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const exports: Record<string, any> = {};
  runInNewContext(output, {
    exports, URL, Buffer, console: { error() {} },
    require(name: string) {
      if (name === 'next/server') return { NextResponse };
      if (name === 'crypto') return crypto;
      if (name in dependencies) return dependencies[name];
      throw new Error(`Unexpected dependency: ${name}`);
    },
  });
  return exports;
}

const id = '11111111-1111-4111-8111-111111111111';
const companyId = '22222222-2222-4222-8222-222222222222';
const routes = [
  { path: 'workspaces/[id]/freeze', method: 'POST', body: { freeze: true }, table: 'companies' },
  { path: 'workspaces/[id]', method: 'PATCH', body: { inbound_delay_minutes: 15 }, table: 'companies' },
  { path: 'users/[id]/revoke-device', method: 'POST', body: { deviceId: id, companyId }, table: 'user_authenticators' },
  { path: 'vendors/[id]', method: 'PATCH', body: { name: 'Updated', account_number: '123456', swift_bic: 'ABCDEFGH', company_id: companyId }, table: 'vendors' },
  { path: 'wires/[id]/state', method: 'PATCH', body: { status: 'denied', company_id: companyId }, table: 'wire_requests' },
];

function godModeRoute(path: string, { denied = false, failure = false, auditFailure = false, storageFailure = false } = {}) {
  const audit: any[] = [];
  const mutations: string[] = [];
  const row = { id, company_id: companyId, user_id: id, name: 'Original', account_number: '0000', swift_bic: null, is_frozen: false, inbound_delay_minutes: 0, status: 'pending_cfo', invoice_path: `${companyId}/invoice.pdf` };
  const adminClient = {
    from(table: string) {
      let update: any = null;
      const query: any = {
        select() { return query; }, eq() { return query; }, is() { return query; }, in() { return query; }, order() { return query; },
        update(values: any) { mutations.push(table); update = values; return query; },
        delete() { mutations.push(table); update = {}; return query; },
        range() { return Promise.resolve({ data: [], error: null }); },
        maybeSingle() { return Promise.resolve({ data: failure && update ? null : { ...row, ...update }, error: null }); },
        then(resolve: any) { resolve({ data: [], count: 0, error: null }); },
      };
      return query;
    },
    storage: { from() { return {
      async createSignedUrl() { return { data: { signedUrl: 'https://example.invalid/invoice' }, error: null }; },
      async download() { return { data: new Blob(['%PDF-original']), error: null }; },
      async copy() { mutations.push('archive'); return { error: storageFailure ? { code: 'COPY_FAILED' } : null }; },
      async upload() { mutations.push('upload'); return { error: null }; },
    }; } },
  };
  const route = loadRoute(`src/app/api/god-mode/${path}/route.ts`, {
    '@/lib/god-mode-api': {
      async authorizeGodModeRequest() {
        return denied ? { response: NextResponse.json({ error: 'Not found' }, { status: 404 }) } :
          { context: { adminClient, actorId: id, identity: { id, email: 'support@example.invalid' } } };
      },
      isSchemaUnavailable() { return false; },
    },
    '@/lib/audit-chain': { async appendAuditLog(_client: any, entry: any) { audit.push(entry); if (auditFailure) throw new Error('Audit unavailable'); } },
  });
  return { route, audit, mutations };
}

for (const spec of routes) {
  for (const ghostMode of [false, true]) {
    test(`${spec.path}: mutation with Ghost Mode ${ghostMode}`, async () => {
      const { route, audit, mutations } = godModeRoute(spec.path);
      const response = await route[spec.method](new Request('https://example.invalid/api', {
        method: spec.method, body: JSON.stringify({ ...spec.body, ghostMode }),
      }), { params: { id } });
      assert.equal(response.status, 200);
      const result = await response.json();
      assert.equal(result.auditLogged, !ghostMode);
      assert.equal(audit.length, ghostMode ? 0 : 1);
      assert.ok(mutations.includes(spec.table));
    });
    test(`${spec.path}: failure logs respect Ghost Mode ${ghostMode}`, async () => {
      const { route, audit } = godModeRoute(spec.path, { failure: true });
      const response = await route[spec.method](new Request('https://example.invalid/api', {
        method: spec.method, body: JSON.stringify({ ...spec.body, ghostMode }),
      }), { params: { id } });
      assert.ok(response.status >= 400);
      assert.equal(audit.length, ghostMode ? 0 : 2);
    });
  }
  test(`${spec.path}: authorization still required in Ghost Mode`, async () => {
    const { route, audit, mutations } = godModeRoute(spec.path, { denied: true });
    const response = await route[spec.method](new Request('https://example.invalid/api', {
      method: spec.method, body: JSON.stringify({ ...spec.body, ghostMode: true }),
    }), { params: { id } });
    assert.equal(response.status, 404);
    assert.equal(audit.length, 0);
    assert.equal(mutations.length, 0);
  });
  test(`${spec.path}: normal mode fails closed if audit append fails`, async () => {
    const { route, mutations } = godModeRoute(spec.path, { auditFailure: true });
    const response = await route[spec.method](new Request('https://example.invalid/api', {
      method: spec.method, body: JSON.stringify({ ...spec.body, ghostMode: false }),
    }), { params: { id } });
    assert.equal(response.status, 503);
    assert.equal(mutations.length, 0);
  });
}

for (const path of ['workspaces/[id]', 'vendors/[id]', 'wires/[id]/state', 'wires/[id]/invoice']) {
  for (const ghostMode of [false, true]) {
    test(`${path}: inspection with Ghost Mode ${ghostMode}`, async () => {
      const { route, audit } = godModeRoute(path);
      const response = await route.GET(new Request(`https://example.invalid/api?ghostMode=${ghostMode}`), { params: { id } });
      assert.equal(response.status, 200);
      assert.equal((await response.json()).auditLogged, !ghostMode);
      assert.equal(audit.length, ghostMode ? 0 : 1);
    });
  }
}

for (const ghostMode of [false, true]) {
  for (const storageFailure of [false, true]) {
    test(`invoice replacement preserves original and respects Ghost Mode ${ghostMode}, archive failure ${storageFailure}`, async () => {
      const { route, audit, mutations } = godModeRoute('wires/[id]/invoice', { storageFailure });
      const form = new FormData();
      form.set('ghostMode', String(ghostMode));
      form.set('invoice', new Blob(['%PDF-replacement'], { type: 'application/pdf' }), 'invoice.pdf');
      const response = await route.POST(new Request('https://example.invalid/api', { method: 'POST', body: form }), { params: { id } });
      assert.equal(response.status, storageFailure ? 500 : 200);
      assert.equal(audit.length, ghostMode ? 0 : 2);
      assert.ok(mutations.includes('archive'));
      assert.equal(mutations.includes('upload'), !storageFailure);
      if (!storageFailure) assert.equal((await response.json()).data.auditLogged, !ghostMode);
    });
  }
}

test('exceptions API queries only schema-backed columns, scopes every page by tenant, restricts roles, preserves CFO quarantine and pages beyond 500 rows', async () => {
  // Derive columns from the checked-in DDL, not from the route's projection.
  const columnsFrom = (path: string, table: string) => {
    const ddl = readFileSync(path, 'utf8');
    const block = ddl.match(new RegExp(`CREATE TABLE (?:IF NOT EXISTS )?${table} \\(([\\s\\S]*?)\\n\\);`));
    assert.ok(block, `Missing schema for ${table}`);
    return new Set(Array.from(block[1].matchAll(/^  (\w+)\s/gm), match => match[1]));
  };
  const wireColumns = columnsFrom('src/lib/schema.sql', 'wire_requests');
  const quarantine = readFileSync('src/lib/schema-v37-god-mode.sql', 'utf8');
  assert.match(quarantine, /ALTER TABLE public.wire_requests\s+ADD COLUMN IF NOT EXISTS visible_after/i);
  wireColumns.add('visible_after');
  const schema: Record<string, Set<string>> = {
    wire_requests: wireColumns,
    vendor_change_requests: columnsFrom('src/lib/schema-v13-vendor-workflow.sql', 'vendor_change_requests'),
  };
  for (const role of [ROLES.CFO, ROLES.AUDITOR]) {
    const queries: any[] = [];
    let allowedRoles: string[] = [];
    const supabase = { from(table: string) {
      const trace: any = { table, filters: [] };
      queries.push(trace);
      function checkColumn(column: string) {
        assert.ok(schema[table]?.has(column), `42703: column ${table}.${column} does not exist`);
      }
      const query: any = {
        select(fields: string) { fields.split(',').map(field => field.trim()).forEach(checkColumn); return query; },
        order(column: string) { checkColumn(column); return query; },
        eq(...args: any[]) { checkColumn(args[0]); trace.filters.push(['eq', ...args]); return query; },
        lte(...args: any[]) { checkColumn(args[0]); trace.filters.push(['lte', ...args]); return query; },
        gte(...args: any[]) { checkColumn(args[0]); trace.filters.push(['gte', ...args]); return query; },
        range(start: number) {
          trace.start = start;
          return Promise.resolve({ error: null, data: table === 'wire_requests' && start === 0 ? Array.from({ length: 500 }, (_, n) => ({ id: `wire-${n}`, vendor_id: null, vendor_name_snapshot: 'Acme', status: 'approved', risk_score: 70, created_at: '2026-10-01T00:00:00Z', amount: 100 })) : [] });
        },
      };
      return query;
    } };
    const route = loadRoute('src/app/api/audit/exceptions/route.ts', {
      '@/lib/api-auth': { withAuth(roles: string[], handler: any) { allowedRoles = roles; return (req: Request) => handler(req, {}, { role, companyId, supabase }); } },
      '@/lib/roles': { ROLES }, '@/lib/compliance-exceptions': exceptions,
    });
    const response = await route.GET(new Request('https://example.invalid/api'));
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.data.length, 500);
    assert.equal(result.data[0].amount, 100);
    assert.equal('currency' in result.data[0], false);
    assert.deepEqual(Array.from(allowedRoles), [ROLES.AUDITOR, ROLES.CFO]);
    assert.equal(queries.filter(q => q.table === 'wire_requests').length, 2);
    for (const query of queries) {
      assert.ok(query.filters.some((f: any[]) => f[0] === 'eq' && f[1] === 'company_id' && f[2] === companyId));
      if (query.table === 'wire_requests') {
        assert.equal(query.filters.some((f: any[]) => f[1] === 'visible_after'), role === ROLES.CFO);
      }
    }
    assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
  }
});

test('exceptions API reports data failures instead of a misleading empty dashboard', async () => {
  const route = loadRoute('src/app/api/audit/exceptions/route.ts', {
    '@/lib/api-auth': { withAuth(_roles: string[], handler: any) {
      return (req: Request) => handler(req, {}, { role: ROLES.AUDITOR, companyId, supabase: { from() { throw new Error('private database detail'); } } });
    } },
    '@/lib/roles': { ROLES }, '@/lib/compliance-exceptions': exceptions,
  });
  const response = await route.GET(new Request('https://example.invalid/api'));
  assert.equal(response.status, 500);
  const result = await response.json();
  assert.equal(result.success, undefined);
  assert.doesNotMatch(result.error, /private database detail/);
});

for (const scenario of [
  { name: 'missing session', user: null, profile: null, status: 401 },
  { name: 'missing tenant', user: { id }, profile: { role: ROLES.AUDITOR }, status: 403 },
  ...[ROLES.CLERK, ROLES.CONTROLLER, 'god_mode'].map(role => ({
    name: role, user: { id }, profile: { company_id: companyId, role }, status: 403,
  })),
]) {
  test(`exceptions API real auth rejects ${scenario.name} before querying wires`, async () => {
    const supabase = {
      auth: { getUser: async () => ({ data: { user: scenario.user }, error: null }) },
      from(table: string) {
        assert.equal(table, 'users', 'Unauthorized requests must not query exception data');
        const query = {
          select() { return query; }, eq() { return query; },
          single: async () => ({ data: scenario.profile, error: null }),
        };
        return query;
      },
    };
    const auth = loadSource('src/lib/api-auth.ts', {
      '@/lib/supabase/server': { createClient: () => supabase }, '@/lib/roles': { ROLES },
    });
    const route = loadRoute('src/app/api/audit/exceptions/route.ts', {
      '@/lib/api-auth': auth, '@/lib/roles': { ROLES }, '@/lib/compliance-exceptions': exceptions,
    });
    assert.equal((await route.GET(new Request('https://example.invalid/api'), {})).status, scenario.status);
  });
}
