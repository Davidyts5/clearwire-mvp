import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canonicalJSON, computeAuditHash, computeGenesisHash, verifyCompanyChain } from '../src/lib/audit-chain';

type AuditRecord = { id: string; previous_hash: string; new_hash: string; event_payload: unknown; created_at: string };
function chain(length: number): AuditRecord[] {
  let previous = computeGenesisHash('tenant-1');
  return Array.from({ length }, (_, index) => {
    const payload = { amount: index + 1, vendor: 'Acme' };
    const row = { id: `event-${index}`, previous_hash: previous, new_hash: computeAuditHash(previous, payload), event_payload: payload, created_at: '2026-10-15T12:00:00Z' };
    previous = row.new_hash;
    return row;
  });
}
function clientFor(rows: AuditRecord[], failure = false) {
  const filters: unknown[][] = [];
  const pages: number[] = [];
  const query = {
    select() { return query; }, order() { return query; },
    eq(...args: unknown[]) { filters.push(args); return query; },
    async range(start: number, end: number) { pages.push(start); return { data: rows.slice(start, end + 1), error: failure ? new Error('Database unavailable') : null }; },
  };
  return { client: { from() { return query; } } as any, filters, pages };
}

test('audit hashing canonicalizes nested object keys while preserving array order', () => {
  const a = { z: [{ b: 2, a: 1 }], a: null };
  const b = { a: null, z: [{ a: 1, b: 2 }] };
  assert.equal(canonicalJSON(a), canonicalJSON(b));
  assert.equal(computeAuditHash('previous', a), computeAuditHash('previous', b));
  assert.notEqual(computeAuditHash('previous', [1, 2]), computeAuditHash('previous', [2, 1]));
  assert.notEqual(computeGenesisHash('tenant-1'), computeGenesisHash('tenant-2'));
});

test('audit verification validates a full paginated tenant chain', async () => {
  const { client, filters, pages } = clientFor(chain(1001));
  const result = await verifyCompanyChain(client, 'tenant-1');
  assert.equal(result.totalRecords, 1001);
  assert.equal(result.validCount, 1001);
  assert.deepEqual(result.invalidIds, []);
  assert.deepEqual(pages, [0, 1000]);
  assert.ok(filters.every(([column, value]) => column === 'company_id' && value === 'tenant-1'));
});

test('audit verification detects altered payloads', async () => {
  const rows = chain(2);
  rows[1].event_payload = { amount: 999999, vendor: 'Acme' };
  const result = await verifyCompanyChain(clientFor(rows).client, 'tenant-1');
  assert.deepEqual(result.invalidIds, ['event-1']);
});

test('audit verification detects broken links and missing records inside a chain', async () => {
  const rows = chain(3);
  rows.splice(1, 1);
  const result = await verifyCompanyChain(clientFor(rows).client, 'tenant-1');
  assert.deepEqual(result.invalidIds, ['event-2']);
});

test('audit verification does not convert database failures into clean results', async () => {
  await assert.rejects(verifyCompanyChain(clientFor([], true).client, 'tenant-1'), /Database unavailable/);
});

test('audit verification handles empty history explicitly', async () => {
  const result = await verifyCompanyChain(clientFor([]).client, 'tenant-1');
  assert.equal(result.totalRecords, 0);
  assert.equal(result.validCount, 0);
});
