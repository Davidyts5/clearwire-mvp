import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import * as react from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import { z } from 'zod';
import * as legal from '../src/lib/legal';
import { ROLE_VALUES } from '../src/lib/roles';
import { loadSource } from './helpers/load-source';

const link = { __esModule: true, default: (props: any) => createElement('a', props) };
const reactDependencies = { react, 'react/jsx-runtime': jsxRuntime, 'next/link': link };

function legalDependencies(env: Record<string, string> = {}) {
  const legalLinks = loadSource('src/components/LegalLinks.tsx', reactDependencies);
  const policyDocument = loadSource('src/components/PolicyDocument.tsx', {
    ...reactDependencies, './LegalLinks': legalLinks, '@/lib/legal': legal,
  });
  const operatorNotice = loadSource('src/components/LegalOperatorNotice.tsx', reactDependencies, env);
  return { ...reactDependencies, '@/components/PolicyDocument': policyDocument, '@/components/LegalOperatorNotice': operatorNotice, '@/lib/legal': legal };
}

function renderPolicy(page: string, env: Record<string, string> = {}) {
  const subject = loadSource(`src/app/${page}/page.tsx`, legalDependencies(env), env);
  return renderToStaticMarkup(createElement(subject.default));
}

test('current pilot notices share a new dated version; the prior source text is preserved', () => {
  assert.equal(legal.TERMS_VERSION, '2026-10-15');
  assert.equal(legal.PRIVACY_NOTICE_VERSION, legal.TERMS_VERSION);
  assert.equal(legal.COOKIE_NOTICE_VERSION, legal.TERMS_VERSION);
  assert.equal(legal.POLICY_UPDATED_ON, '15 October 2026');
  const archive = readFileSync('docs/legal/archive/2026-10-12.html', 'utf8');
  assert.match(archive, /2026-10-12/);
  assert.match(archive, /Superseded/);
});

for (const page of ['terms', 'privacy', 'cookies']) {
  test(`${page}: renders pilot version, legal links and explicit missing-operator warning`, () => {
    const html = renderPolicy(page);
    assert.match(html, /2026-10-15/);
    assert.match(html, /15 October 2026/);
    assert.match(html, /Operator details are not fully configured/);
    assert.match(html, /Not configured/);
    assert.match(html, /href="\/terms"/);
    assert.match(html, /href="\/privacy"/);
    assert.match(html, /href="\/cookies"/);
  });
}

test('operator details use configured values without inventing or rendering injected HTML', () => {
  const html = renderPolicy('terms', {
    CLEARWIRE_LEGAL_ENTITY_NAME: '  Example Pilot Ltd <script>  ',
    CLEARWIRE_PRIVACY_EMAIL: 'privacy@example.invalid',
    CLEARWIRE_BUSINESS_ADDRESS: 'Example business address',
  });
  assert.doesNotMatch(html, /Operator details are not fully configured/);
  assert.match(html, /Example Pilot Ltd &lt;script&gt;/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /href="mailto:privacy@example.invalid"/);
  assert.match(html, /Example business address/);
});

test('terms disclose pilot/live-data, billing, access, support-log and acceptance limitations', () => {
  const html = renderPolicy('terms');
  for (const text of [
    'fictional or properly anonymized', 'not yet enforced', 'Ghost Mode',
    'bypass the workspace WORM audit ledger', 'does not automatically renew',
    'no integrated checkout', 'no automatic reacceptance workflow',
    'does not hold funds', 'do not set a monetary liability cap',
  ]) assert.ok(html.includes(text), `Missing disclosure: ${text}`);
});

test('privacy notice covers support archives, provider uncertainty and the real request behavior', () => {
  const html = renderPolicy('privacy');
  for (const text of [
    'Supabase', 'Resend', 'Twilio', 'Ghost Mode', 'prior invoice',
    'not a data-processing agreement', 'no automatic retention schedule',
    'does not delete data, send an email, open a processing queue, or notify the operator',
    'not yet a complete public privacy-request channel', 'hosting regions',
  ]) assert.ok(html.includes(text), `Missing disclosure: ${text}`);
});

test('cookie notice distinguishes renewable authentication from consent and data deletion', () => {
  const html = renderPolicy('cookies');
  for (const text of [
    'sb-&lt;project-ref&gt;-auth-token', 'code-verifier', '3,600-second',
    'not a guaranteed absolute one-hour session limit', 'not record consent',
    'not delete your account', 'No dismissal cookie or local-storage entry',
  ]) assert.ok(html.includes(text), `Missing disclosure: ${text}`);
  assert.doesNotMatch(html, /one-hour maximum age/);
  const banner = readFileSync('src/components/CookieNotice.tsx', 'utf8');
  assert.match(banner, /Dismissing this notice does not give consent/);
  assert.doesNotMatch(banner, /localStorage|sessionStorage|document\.cookie/);
});

function acceptanceRoute(path: string) {
  const events: any[] = [];
  let signups = 0;
  const invite = { id: 'invite-fixture', email: 'member@example.invalid', role: 'clerk', company_id: 'tenant-fixture', expires_at: '2999-01-01T00:00:00Z', status: 'pending' };
  const query = { select() { return query; }, eq() { return query; }, async single() { return { data: invite, error: null }; } };
  const admin = {
    from() { return query; },
    async rpc() { return { data: { company_id: 'tenant-fixture', slug: 'test-workspace' }, error: null }; },
    auth: { admin: { async deleteUser() { throw new Error('Unexpected deletion'); } } },
  };
  const route = loadSource(path, {
    '@/lib/api-auth': { async getAdminClient() { return admin; } },
    '@/lib/supabase/server': { createClient() { return { auth: { async signUp() {
      signups++;
      return { data: { user: { id: 'user-fixture' }, session: null }, error: null };
    } } }; } },
    '@/lib/audit-chain': { async appendAuditLog(_client: unknown, event: unknown) { events.push(event); } },
    '@/lib/legal': legal, zod: { z },
  });
  return { route, events, signupCount: () => signups };
}

const validBody = { companyName: 'Example Company', fullName: 'Example Member', email: 'member@example.invalid', password: 'test-password-not-used-live', termsAccepted: true };

for (const path of ['src/app/api/auth/onboard/route.ts', 'src/app/api/team/invites/[token]/route.ts']) {
  test(`${path}: stores current terms/privacy versions on acceptance`, async () => {
    const { route, events, signupCount } = acceptanceRoute(path);
    const response = await route.POST(new Request('https://example.invalid/api', { method: 'POST', body: JSON.stringify(validBody) }), { params: { token: 'test-token' } });
    assert.equal(response.status, 200);
    assert.equal(signupCount(), 1);
    assert.equal(events.length, 1);
    const acknowledgement = events[0].eventPayload.legal_acceptance;
    assert.equal(acknowledgement.terms_version, legal.TERMS_VERSION);
    assert.equal(acknowledgement.privacy_notice_version, legal.PRIVACY_NOTICE_VERSION);
    assert.ok(Number.isFinite(Date.parse(acknowledgement.accepted_at)));
  });

  test(`${path}: rejects absent, false or string acknowledgements before account creation`, async () => {
    for (const termsAccepted of [undefined, false, 'true']) {
      const { route, events, signupCount } = acceptanceRoute(path);
      const response = await route.POST(new Request('https://example.invalid/api', { method: 'POST', body: JSON.stringify({ ...validBody, termsAccepted }) }), { params: { token: 'test-token' } });
      assert.ok(response.status >= 400);
      assert.equal(signupCount(), 0);
      assert.equal(events.length, 0);
    }
  });
}

test('privacy requests record the current notice version and do not implement deletion or email', async () => {
  const events: any[] = [];
  const route = loadSource('src/app/api/privacy/data-request/route.ts', {
    '@/lib/api-auth': {
      withAuth(roles: string[], handler: any) {
        assert.deepEqual(Array.from(roles), Array.from(ROLE_VALUES));
        return (request: Request) => handler(request, {}, { companyId: 'tenant-fixture', userId: 'user-fixture' });
      },
      async getAdminClient() { return {}; }, // No delete or mail methods: any such call would fail this test.
    },
    '@/lib/roles': { ROLE_VALUES }, '@/lib/legal': legal, zod: { z },
    '@/lib/audit-chain': { async appendAuditLog(_client: unknown, event: unknown) { events.push(event); } },
  });
  const response = await route.POST(new Request('https://example.invalid/api', { method: 'POST', body: JSON.stringify({ requestType: 'deletion', confirmed: true }) }));
  assert.equal(response.status, 200);
  assert.equal(events.length, 1);
  assert.equal(events[0].action, 'PRIVACY_DELETION_REQUESTED');
  assert.equal(events[0].eventPayload.privacy_notice_version, legal.PRIVACY_NOTICE_VERSION);
  const invalid = await route.POST(new Request('https://example.invalid/api', { method: 'POST', body: JSON.stringify({ requestType: 'deletion', confirmed: false }) }));
  assert.equal(invalid.status, 400);
  assert.equal(events.length, 1);
});
