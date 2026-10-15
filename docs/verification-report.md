# Repository verification report

Date: 2026-10-15  
Scope: automated repository checks and targeted security regression tests for the current Compliance Hub branch.

## Release assessment

**Not cleared for production.** The automated suite passes, but dependency vulnerabilities, public onboarding, existing type/lint failures, and unverified live integrations remain. This is not a penetration test or a guarantee that the application cannot be hacked.

## Results

| Check | Result |
| --- | --- |
| `npm test` | **85 passed; 0 failed; 0 skipped.** |
| `npm run typecheck` | **Failed:** 5 existing application diagnostics. The broken Jest-global diagnostics were removed by making the RBAC suite runnable with Node's test runner. |
| `npm run lint` | **Failed:** 8 errors and 2 warnings across 124 source/test files. |
| Lint on all tests and the cron fix | **Passed.** |
| `npm run build` | **Blocked:** existing `next/font` Inter download from Google Fonts is inaccessible in the sandbox. A completed production build is not verified. |
| `npm audit` | **Failed:** 22 vulnerable-package findings: 1 critical, 18 high, 3 moderate. |
| `npm audit --omit=dev` | **Failed:** 6 production-dependency findings: 1 critical, 4 high, 1 moderate. |
| `git diff --check` | **Passed.** |

Dependency findings describe affected package versions and transitive dependency chains; they do not establish that every advisory is exploitable in this deployment.

## Fixed during verification

### Cron authentication failed open when its secret was missing

File: `src/app/api/cron/reminders/route.ts`

The handler compared the Authorization header against a string interpolating `process.env.CRON_SECRET` without first requiring that variable to exist. In an isolated test of the real handler, an unset secret plus the literal `Bearer undefined` header reached the privileged client and returned HTTP 200.

The handler now rejects missing/empty secret configurations with HTTP 401 before obtaining a service-role client. Regression cases cover missing credentials, missing/empty secret configuration, incorrect credentials, and a configured valid credential. The missing-secret regression failed before the fix and passes afterward.

### Legacy RBAC tests were not executable

The existing RBAC file used Jest globals even though Jest is not installed/configured. Converted its assertions to `node:test` and `node:assert/strict`; the original three tests now run alongside the other suites.

Added reproducible `npm test`, `npm run typecheck`, and noninteractive repository-wide lint configuration. No dependency versions were changed.

## Automated coverage added

- Actual authentication wrapper: missing/invalid sessions, missing tenants, profile lookup errors, disallowed/unknown roles, and ignoring client-supplied identity/tenant/role claims.
- Tenant-resource helper: mismatched tenant, missing resource, failed lookup, matching tenant.
- Segregation-of-duties helper: self-approval rejection, missing resource, separate approver.
- Super Admin allowlist: empty configuration, unlisted users, invalid auth responses, identity validation, case/whitespace normalization, provider failures.
- God Mode authorization: authorization before service-role client creation, missing actors, database/service errors, valid actor.
- Cron authentication, including the reproduced missing-secret bypass.
- Audit-chain verification: canonical serialization, tenant-specific genesis, 1,001-record pagination, altered payloads, broken links/missing intermediate records, empty history, and database failures.

These run in addition to the 50 existing Compliance Hub tests covering exceptions, CSV safety, readable histories, support-action audit policy, invoice preservation, tenant-scoped reads, and CFO quarantine predicates.

**Boundary:** Authentication/database/storage providers are mocked. Tests exercise real local handlers/helpers but do not prove deployed Supabase row-level security, deployed secrets, email/passkey behavior, or browser workflows.

## Unresolved release blockers

### 1. Critical framework/dependency findings

The installed `next@14.2.3` is flagged critical. The audit includes the middleware authorization-bypass advisory:
https://github.com/advisories/GHSA-f82v-jwr5-mffw

The production dependency audit also flags `axios`, `nanoid`, `postcss`, `qs`, and `source-map-js`. Upgrade to supported patched versions, assess breaking changes, and rerun checks in staging. No automatic `npm audit fix --force` was applied.

### 2. Invite-only access is not enforced at the application boundary

- `src/app/signup/page.tsx` still renders workspace registration.
- `src/app/api/auth/onboard/route.ts` accepts onboarding submissions without an administrator/invitation authorization check and attempts signup plus service-role tenant provisioning.
- `src/middleware.ts` treats `/signup` as an authentication/public route.

Removing the login link only changes discoverability. Decide the intended administrator onboarding workflow, then enforce that policy server-side. Live Supabase signup settings were not inspected, so this is an application-code finding rather than a claim of successful live registration.

### 3. Existing TypeScript failures

- `src/app/api/notifications/route.ts:10`: Set iteration conflicts with the ES5 compiler target.
- `src/app/cfo-portal/page.tsx:6`: imports a nonexistent `supabase` export.
- `src/app/cfo-portal/page.tsx:171`: missing `AlertTriangle` import.
- `src/app/cfo-portal/team/page.tsx:192`: unsupported `title` prop on the icon.
- `src/app/dashboard/page.tsx:6`: imports a nonexistent `supabase` export.

### 4. Existing lint failures and bypassed build checks

Eight lint errors remain: the missing `AlertTriangle` above and unescaped JSX text in the CFO devices, clerk dashboard, signup, team, and vendor-request pages. Hook-dependency warnings remain in the investigation page and `DataFilters`.

`next.config.js` currently sets both `ignoreBuildErrors` and `ignoreDuringBuilds`. A successful build would therefore not replace separate type/lint checks. Remove those bypasses after resolving the failures, or enforce equivalent mandatory CI checks.

### 5. Live verification unavailable

No Supabase URL/keys are configured in the test environment; outbound Supabase and Google Fonts access is restricted. No live database, RLS, email, passkey, browser, or deployed cron test was performed. The root `test-api.js` and `test-db2.js` scripts require service credentials and inspect live database rows; they were reviewed but not executed.

## Audit-policy reminder

Ghost Mode intentionally suppresses support-action WORM events per the prior request. Passing tests confirm that behavior; they do not make those interventions auditable. Audit-chain verification cannot detect an event that was never written. Keep the operational/compliance implications distinct from access-control testing.

## Recommended next steps

1. Gate public onboarding and upgrade vulnerable production dependencies before launch.
2. Fix the type/lint failures and make those checks mandatory in CI.
3. Complete a production build with permitted font access (or approved self-hosted fonts).
4. Run authenticated staging tests across all roles, tenant boundaries, invites, passkeys, quarantine, invoices, CSV/PDF export, and both Ghost Mode states.
