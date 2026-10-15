# Customer-pilot legal and operational checklist

Draft pack dated **15 October 2026**. This is an implementation checklist, not legal advice, a signed pilot agreement, a security certification, or permission to start a live-data pilot. Have qualified counsel review the documents for the actual operator, customers and jurisdictions.

## What changed

- `/terms`: early-access evaluation scope; authority to participate; permitted data; human payment controls; operator-only support access and customer-history limits; written fees/refunds/renewal terms; pilot-end exports/deletion; privacy and version acknowledgement.
- `/privacy`: data sources and purposes; workspace and support access; provider integrations and location uncertainty; retention gaps; statutory-rights requests; clear limits on the deletion form.
- `/cookies`: expected Supabase cookie patterns, refreshable lifetimes, memory-only banner dismissal, browser controls, and no invented cookie-consent functionality.
- Data-request copy, third-party notices, operator notice and cookie banner are aligned with the pilot language.
- Terms/privacy versions are now `2026-10-15.1`; the unchanged cookie notice remains `2026-10-15`. Existing signup/invitation acceptance events and privacy-request events use the shared constants. Historical audit records are not rewritten.
- Previous notice text is preserved in `archive/2026-10-12.html` and `archive/2026-10-15.html`. That archive is a source-text snapshot, not a record of the operator details used in any particular deployment or proof of a user's acceptance.

## 1. Identify the actual business — currently missing

The repository has configuration fields but **no legal entity name, privacy email or business address values**. No business identity, email address or governing law was invented.

Configure and verify:

- `CLEARWIRE_LEGAL_ENTITY_NAME`: the actual contracting legal entity, not just a product nickname unless that is legally appropriate.
- `CLEARWIRE_PRIVACY_EMAIL`: a real monitored mailbox with an owner and an escalation process.
- `CLEARWIRE_BUSINESS_ADDRESS`: a business address appropriate for public legal notices.

Use a verified operational-email sender as well; `onboarding@resend.dev` in the code is not a legal/privacy contact. Rebuild/redeploy after changing server-side operator configuration and verify all public notices show the intended details.

## 2. Agree a written pilot plan before inviting customers

Have the operator and participating organization agree:

- Legal parties and authorized signatories.
- Pilot start/end dates, evaluation goals, authorized users and features.
- Bank-side access controls, payment approval requirements and reconciliation: ClearWire is not connected to a bank and cannot stop AP staff from paying outside its workflow.
- Approved data categories: start with fictional/properly anonymized data. Live data requires explicit approval after security review and necessary data-processing terms.
- Onboarding/support contact, support hours, authorized support actions, and how corrections are approved.
- Whether operator support interventions must be fully logged for the agreed pilot. Internal operator tools are not customer features; customer-visible history does not include every support action. Disclosure alone does not satisfy a complete-audit requirement.
- Fees (if any), currency, taxes, invoicing, due dates, cancellation and refunds. Do not assume the prior suggested pilot price has been agreed.
- No automatic paid conversion or renewal unless separately agreed.
- Suspension/termination, available exports, return/deletion of records, preserved invoice originals, logs and backups.
- Any negotiated service levels, liability allocation, governing law and dispute arrangements. The draft website terms deliberately do not invent these.

## 3. Complete privacy operations before live personal data

- Determine controller/processor or other applicable roles for each purpose and sign required agreements.
- Document lawful bases, employee/vendor notices, access controls and support responsibilities.
- Confirm actual provider accounts, regions, subprocessors, contracts and transfer safeguards. The repository does not establish production data residency.
- Set retention periods and a workable deletion/return process, including audit records, invoice archives, provider backups and exported copies.
- Establish a monitored rights-request channel, identity verification, internal ownership and applicable response deadlines.
- The current `/privacy/data-request` form only writes an audit entry visible to authorized workspace reviewers; it does not send a message or create a processing queue. The operator must not rely on it alone to receive or resolve legal requests.
- Review notification recipients and content, especially the optional Twilio CFO SMS, before using real vendor/payment details.

## 4. Fix technical blockers — wording does not fix them

See `../verification-report.md` for the previous repository-wide findings, including:

- Public `/signup` and unauthenticated `/api/auth/onboard`: the intended invitation-led pilot model is not yet enforced throughout the application.
- Dependency vulnerabilities, including the Next.js finding.
- Existing type/lint failures and build checks configured to ignore failures.
- Production build and authenticated staging verification still required.

Updating policy text does not repair these issues or authorize production use. Keep demonstrations on fictional/properly anonymized records until readiness is established.

## 5. Validate cookies in a deployed browser

Check sign-in, refresh, sign-out and invitation flows on the actual domain. Record cookie names, attributes, expiry, renewal and any provider-added storage. The client and middleware request one-hour cookie lifetimes, but server authentication writes may use other options; this is not an absolute session-duration guarantee.

The banner is informational. Dismissing it is memory-only and does not record consent or prevent tracking. If optional tags or widgets are added, implement the applicable consent/opt-out behavior before enabling them and update the notices.

## 6. Handle versions and existing customers

New workspace/invitation completion flows record the current shared versions. Existing users are **not** automatically shown a reacceptance screen. For a material change, notify affected customers through the agreed channel, obtain agreement/consent where required, and retain the accepted text and evidence. A date change alone is not acceptance.

## Checks for this pack

```sh
npm ci --ignore-scripts
npm test
npm run typecheck
npm run lint
npm run build
```

The new legal-notice tests render the actual policy components and check versioning, missing/configured operator states, essential-cookie disclosures and material limitations. Mocked route tests check that onboarding/invitation acceptance and privacy requests record the new versions and reject missing acknowledgements. They do not replace counsel review, browser validation or live-provider testing.
