# Audit exceptions: schema and validation

## Schema review

- `src/lib/schema.sql`, `wire_requests`: `id`, `company_id`, `vendor_id`, `vendor_name_snapshot`, `amount DECIMAL(12,2)`, `created_at`, `risk_score`, `status` all exist.
- `src/lib/schema-v37-god-mode.sql`: adds `wire_requests.visible_after`, used by the unchanged CFO quarantine filter.
- `src/lib/schema-v13-vendor-workflow.sql`, `vendor_change_requests`: `id`, `company_id`, `vendor_id`, `status`, `reviewed_at` cover the projection, filters and ordering. The review API uses `reviewed_at` as the approval timestamp.
- Currency is vendor metadata (`schema-v11-vendors.sql` / `schema-v12-vendor-management.sql`), not a wire column. Wire creation (`src/app/api/wires/route.ts`) stores the amount but no currency snapshot. Some existing flows use dollar copy; that is not evidence of historical currency for each wire. Joining today's mutable vendor currency would misrepresent history.

No database migration or data change is needed. Exceptions omit currency from the query, response type, table and CSV. A shared Decimal-based formatter emits two decimal places in the UI and CSV without guessing currency or introducing binary floating-point rounding. The page explains the missing currency. The CSV now has five columns (Currency removed); downstream consumers must accommodate that change.

## Mobile layout

The shared mobile header now occupies normal document flow and scrolls away with content, rather than sticking over page headings. Desktop sidebar stickiness and mobile drawer offsets are unchanged. This intentionally changes mobile header scrolling throughout the app, not just the exceptions page.

## Validation

After reinstalling the lockfile dependencies with `npm ci --ignore-scripts --no-audit --no-fund` (the supplied dependency directory was incomplete):

- `npm test`: **131 passed**, zero failures. Includes schema-derived checks for all selected, filtered and ordered exception-query columns; pagination; tenant filters on every page; CFO quarantine; Auditor/CFO allowlist; actual auth-wrapper rejection of missing sessions, missing tenants, Clerk, Controller and support roles; error redaction; shared amount formatting and CSV escaping/formula safety; mobile layout class regression.
- ESLint on all six changed source/test files: passed.
- `git diff --check` on source/tests: passed.
- `npm run typecheck`: blocked by existing errors in `src/app/api/notifications/route.ts:10` (Set iteration / compiler target) and `src/app/dashboard/page.tsx:6` (nonexistent `supabase` export). Neither file is modified here.
- `npm run lint`: existing six unescaped-entity errors in clerk-dashboard, signup, team and vendor-requests, plus two hook-dependency warnings in investigations and DataFilters. None is modified here.
- `npm run build`: blocked by network access to Google Fonts (`next/font` Inter in root layout). Build configuration already skips type and lint checking, so build success alone would not establish either.

## Remaining checks

No live tenant credentials/database connection were supplied; schema verification uses checked-in SQL, and route execution uses mocked database I/O. Confirm deployed schema matches the required migrations and smoke-test Auditor/CFO sessions against real tenant data before rollout. Mobile overlap coverage is a structural class regression, not a pixel-level browser test; verify initial render and scrolling at narrow widths, the mobile drawer, and desktop navigation in a browser. Historical wire currency remains unknown; recording it would require a separately designed snapshot/data-migration policy, not a fallback.
