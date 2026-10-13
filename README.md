# ClearWire MVP

A B2B payment-request review and approval workflow demo. ClearWire records vendor/payment-request details, review signals, passkey-confirmed approvals, and an audit history. It does not connect to a bank, initiate or release payments, or replace an organization's existing payment controls.

## Schema changes

Never edit archived SQL. If a database change is needed, add a new manually reviewed file named `src/lib/schema-v[NEXT]-<purpose>.sql`; do not execute it from this repository. Checked-in SQL records application history and is not proof of the currently deployed Supabase schema. Before any manual execution, inspect the migration and confirm that it is additive and appropriate for the actual live database.

## Legal and launch configuration

Privacy, terms, cookie, and third-party notices are working demo drafts. Configure `CLEARWIRE_LEGAL_ENTITY_NAME`, `CLEARWIRE_PRIVACY_EMAIL`, and `CLEARWIRE_BUSINESS_ADDRESS`, verify the live Supabase/Resend/Twilio/hosting configuration and retention practices, and obtain appropriate review before public or production use. Do not enter live bank credentials or real payment instructions in a demo environment.
