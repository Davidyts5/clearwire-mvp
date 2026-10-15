import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { NextRequest } from 'next/server';
import { redirect } from 'next/navigation';
import * as roles from '../src/lib/roles';
import { loadSource } from './helpers/load-source';

const routes = [
  { from: '/cfo-portal', to: '/cfo-dashboard', cfoOnly: true },
  { from: '/cfo-portal/team', to: '/team', cfoOnly: true },
  { from: '/cfo-portal/settings', to: '/settings', cfoOnly: true },
  { from: '/cfo-portal/devices', to: '/profile', cfoOnly: false },
];

function retiredPage(path: string) {
  // Use the real Next.js redirect implementation. No database, fetch, React,
  // or client-component dependency is allowed when loading these small pages.
  return loadSource(`src/app${path}/page.tsx`, { 'next/navigation': { redirect } }).default;
}

function middlewareFor(role: roles.Role | null) {
  return loadSource('src/middleware.ts', {
    './lib/roles': roles,
    './config/navigation': { NAVIGATION_CONFIG: [] },
    '@supabase/ssr': {
      createServerClient() {
        const query = {
          select() { return query; },
          eq() { return query; },
          async single() { return { data: { role }, error: null }; },
        };
        return {
          auth: { async getSession() { return { data: { session: role ? { user: { id: 'test-user' } } : null } }; } },
          from() { return query; },
        };
      },
    },
  }).middleware;
}

for (const route of routes) {
  test(`${route.from}: redirects server-side to ${route.to} without mounting the old screen`, () => {
    const source = readFileSync(`src/app${route.from}/page.tsx`, 'utf8');
    assert.doesNotMatch(source, /use client|useEffect|fetch\(|startRegistration|supabase/);
    assert.throws(retiredPage(route.from), (error: any) => {
      assert.equal(error.message, 'NEXT_REDIRECT');
      assert.equal(error.digest, `NEXT_REDIRECT;replace;${route.to};307;`);
      return true;
    });
  });

  test(`${route.from}: signed-out visitors still go to login`, async () => {
    const middleware = middlewareFor(null);
    const response = await middleware(new NextRequest(`https://example.invalid${route.from}`));
    assert.equal(response.status, 307);
    const location = new URL(response.headers.get('location')!);
    assert.equal(location.pathname, '/login');
    assert.equal(location.searchParams.get('next'), route.from);
  });

  for (const role of roles.ROLE_VALUES) {
    test(`${route.from}: ${role} follows the redirect without bypassing destination permissions`, async () => {
      const middleware = middlewareFor(role);
      const oldResponse = await middleware(new NextRequest(`https://example.invalid${route.from}`));
      assert.equal(oldResponse.headers.get('x-middleware-next'), '1');
      assert.throws(retiredPage(route.from), (error: any) => error.digest === `NEXT_REDIRECT;replace;${route.to};307;`);

      const response = await middleware(new NextRequest(`https://example.invalid${route.to}`));
      if (route.cfoOnly && role !== roles.ROLES.CFO) {
        assert.equal(response.status, 307);
        assert.equal(new URL(response.headers.get('location')!).pathname, roles.DashboardRoutes[role]);
      } else {
        assert.equal(response.headers.get('x-middleware-next'), '1');
        assert.equal(response.headers.get('location'), null);
      }
    });
  }
}
