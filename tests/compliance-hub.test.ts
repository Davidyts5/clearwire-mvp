import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findComplianceExceptions, exceptionsToCsv, formatExceptionAmount, type ExceptionWire } from '../src/lib/compliance-exceptions';
import { auditCategory, describeAuditEvent } from '../src/lib/audit-story';

const wire: ExceptionWire = {
  id: 'wire-1', vendor_id: 'vendor-1', vendor_name_snapshot: 'Acme', amount: '1200.50',
  created_at: '2026-10-14T12:00:00Z', status: 'approved', risk_score: 70,
};

test('high risk requires both score >= 70 and approved status', () => {
  assert.equal(findComplianceExceptions([wire], []).length, 1);
  assert.equal(findComplianceExceptions([{ ...wire, risk_score: 69 }], []).length, 0);
  assert.equal(findComplianceExceptions([{ ...wire, risk_score: null }], []).length, 0);
  for (const status of ['pending_cfo', 'frozen', 'rejected', 'denied']) {
    assert.equal(findComplianceExceptions([{ ...wire, status }], []).length, 0);
  }
});

test('vendor approvals use inclusive seven-day boundaries and any wire status', () => {
  const lowRisk = { ...wire, risk_score: 10, status: 'pending_cfo' };
  const change = { vendor_id: 'vendor-1', status: 'approved', reviewed_at: '2026-10-07T12:00:00Z' };
  assert.equal(findComplianceExceptions([lowRisk], [change]).length, 1);
  assert.equal(findComplianceExceptions([lowRisk], [{ ...change, reviewed_at: wire.created_at }]).length, 1);
  for (const reviewed_at of ['2026-10-07T11:59:59.999Z', '2026-10-14T12:00:00.001Z', null, 'invalid']) {
    assert.equal(findComplianceExceptions([lowRisk], [{ ...change, reviewed_at }]).length, 0);
  }
  assert.equal(findComplianceExceptions([lowRisk], [{ ...change, vendor_id: 'vendor-2' }]).length, 0);
  assert.equal(findComplianceExceptions([lowRisk], [{ ...change, status: 'pending' }]).length, 0);
  assert.equal(findComplianceExceptions([{ ...lowRisk, vendor_id: null }], [change]).length, 0);
});

test('both criteria create one row with two explanations, not duplicate wires', () => {
  const change = { vendor_id: 'vendor-1', status: 'approved', reviewed_at: '2026-10-13T12:00:00Z' };
  const result = findComplianceExceptions([wire], [change, change]);
  assert.equal(result.length, 1);
  assert.equal(result[0].reasons.length, 2);
});

test('CSV includes displayed rows and reasons, escapes quotes/newlines and blocks formulas', () => {
  const result = findComplianceExceptions([{ ...wire, vendor_name_snapshot: 'Acme, "Ltd"\nNorth' }], []);
  const csv = exceptionsToCsv(result);
  assert.ok(csv.startsWith('\uFEFF"Wire ID"'));
  assert.ok(csv.includes('"Acme, ""Ltd""\nNorth"'));
  assert.ok(csv.includes('"1200.50","2026-10-14T12:00:00Z"'));
  assert.doesNotMatch(csv, /Currency|USD|undefined|null/);
  assert.ok(csv.includes('High-risk wire approved (risk score 70)'));
  for (const vendor of ['=1+1', '+SUM(A1)', '-1+2', '@SUM(A1)', '  =1+1', '\t=1+1']) {
    assert.ok(exceptionsToCsv([{ ...result[0], vendor_name_snapshot: vendor }]).includes(`"'${vendor}"`));
  }
  assert.equal(exceptionsToCsv([]).split('\r\n').length, 2);
});

test('stories render useful English without hashes or raw payloads', () => {
  const actor = { full_name: 'Alex' };
  assert.equal(describeAuditEvent({ action: 'CREATED', actor, event_payload: { vendor: 'Acme' } }), 'Alex requested a wire to Acme.');
  assert.equal(describeAuditEvent({ action: 'CREATED', event_payload: JSON.stringify({ vendor: 'Acme' }) }), 'User requested a wire to Acme.');
  assert.equal(describeAuditEvent({ action: 'STATE_CHANGED_TO_DENIED', actor, event_payload: { rejection_reason: 'Duplicate invoice' } }), 'Alex declined the wire. Reason: Duplicate invoice.');
  assert.equal(describeAuditEvent({ action: 'SYSTEM_SUPPORT_INTERVENTION' }), 'ClearWire Support manually updated this record.');
  assert.match(describeAuditEvent({ action: 'SYSTEM_SUPPORT_INTERVENTION', event_payload: { operation_status: 'requested' } }), /requested a manual update/);
  assert.match(describeAuditEvent({ action: 'SYSTEM_SUPPORT_INTERVENTION', event_payload: { type: 'WIRE_STATE_FORCE_FAILED' } }), /operation failed/);
  assert.match(describeAuditEvent({ action: 'SYSTEM_SUPPORT_INTERVENTION', event_payload: { type: 'VENDOR_DETAILS_INSPECTED' } }), /viewed/);
  assert.match(describeAuditEvent({ action: 'VENDOR_CHANGE_CFO_APPROVED', actor }), /Alex approved the vendor change/);
  for (const event_payload of [null, '{bad json', { new_hash: 'SECRET_HASH', account_number: 'SECRET_ACCOUNT' }]) {
    const description = describeAuditEvent({ action: 'UNKNOWN_EVENT', event_payload });
    assert.doesNotMatch(description, /SECRET|UNKNOWN_EVENT|\{/);
  }
  assert.equal(auditCategory({ action: 'SYSTEM_SUPPORT_INTERVENTION', wire_id: 'wire-1' }), 'WIRE');
  assert.equal(auditCategory({ action: 'SYSTEM_SUPPORT_INTERVENTION', event_payload: { type: 'DEVICE_REVOKED_BY_SUPPORT' } }), 'USER');
});

test('invite-only copy and simplified history remain in the default UI', async () => {
  const { readFileSync } = await import('node:fs');
  const login = readFileSync('src/app/login/page.tsx', 'utf8');
  assert.ok(login.includes('Not part of a workspace yet? Contact your administrator for an invite.'));
  assert.doesNotMatch(login, /href=["']\/signup/);
  const reports = readFileSync('src/app/auditor-dashboard/reports/page.tsx', 'utf8');
  assert.doesNotMatch(reports, /verify-all|runGlobalScan|Global Integrity Scan|W3C Cryptographic Scan/);
  for (const file of ['src/app/auditor-dashboard/ledger/page.tsx', 'src/app/auditor-dashboard/investigations/[id]/page.tsx']) {
    const source = readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /previous_hash|new_hash|JSON.stringify\(log.event_payload/);
    assert.ok(source.includes('describeAuditEvent(log)') || source.includes('describeAuditEvent(event)'));
  }
  assert.doesNotMatch(readFileSync('src/app/god-mode/GodModeClient.tsx', 'utf8'), /does not suppress|display-only|Display-only/);
});


test('amount display and CSV share fixed-scale formatting without inventing currency', () => {
  for (const [amount, expected] of [[100, '100.00'], ['1200.50', '1200.50'], ['9999999999.99', '9999999999.99'], ['0.01', '0.01']] as const) {
    assert.equal(formatExceptionAmount(amount), expected);
    assert.ok(exceptionsToCsv(findComplianceExceptions([{ ...wire, amount }], [])).includes(`"${expected}"`));
  }
});

test('exceptions UI uses the CSV amount formatter and mobile header stays in normal flow', async () => {
  const { readFileSync } = await import('node:fs');
  const page = readFileSync('src/app/auditor-dashboard/page.tsx', 'utf8');
  assert.ok(page.includes('{formatExceptionAmount(wire.amount)}'));
  assert.doesNotMatch(page, /wire.currency/);
  const sidebar = readFileSync('src/components/Sidebar.tsx', 'utf8');
  const header = sidebar.match(/className="(md:hidden flex items-center justify-between[^"\n]+)"/);
  assert.ok(header);
  assert.match(header[1], /relative/);
  assert.match(header[1], /shrink-0/);
  assert.doesNotMatch(header[1], /sticky|fixed/);
  assert.match(sidebar, /hidden md:flex[^"\n]*sticky top-0/);
});
