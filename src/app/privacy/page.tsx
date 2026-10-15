import type { Metadata } from 'next';
import PolicyDocument from '@/components/PolicyDocument';
import LegalOperatorNotice from '@/components/LegalOperatorNotice';
import { PRIVACY_NOTICE_VERSION } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Pilot Privacy Notice | ClearWire',
  description: 'Data handling, support access, service providers, and privacy requests during a ClearWire early-access pilot.',
};

export default function PrivacyPage() {
  return (
    <PolicyDocument title="Privacy notice" description="How the current early-access build handles information during a business pilot.">
      <p className="rounded-lg border border-[#d7c8a9] bg-[#fbf7ed] p-4 text-sm leading-6 text-[#594d3e]">
        Pilot draft · version {PRIVACY_NOTICE_VERSION}. This notice describes the app code, not a certification of a live deployment. Before accepting live personal or payment data, the operator and participating organization must confirm their identities, responsibilities, providers, hosting regions, retention arrangements, and any required data-processing terms. Until then, use fictional or properly anonymized test data only.
      </p>

      <LegalOperatorNotice />

      <section aria-labelledby="privacy-responsibility">
        <h2 id="privacy-responsibility" className="text-xl font-semibold text-[#203329]">1. Responsibility for information</h2>
        <p className="mt-3">A participating organization decides which staff, vendors and payment requests to include in its workspace and manages authorized membership. The operator provides the service and its support tools. Whether a party acts as a controller, processor, service provider, or another legally defined role depends on the purpose, applicable law, and pilot agreement; this notice is not a data-processing agreement.</p>
        <p className="mt-3">The organization should tell its staff and relevant vendor contacts about the pilot and provide any required notices. The operator must identify a usable privacy contact and document the applicable legal bases and processing instructions before live personal data is accepted. Accepting the product terms or acknowledging this notice is not a substitute for a required legal basis or separate consent.</p>
      </section>

      <section aria-labelledby="privacy-data">
        <h2 id="privacy-data" className="text-xl font-semibold text-[#203329]">2. Information the app handles and its sources</h2>
        <ul className="mt-3 list-disc space-y-2 pl-6 marker:text-[#66896a]">
          <li><strong>Accounts and workspaces:</strong> company name, member name and business email, account identifier, role, approval limits, invitation status, and notification preferences. These come from the member, an inviting administrator, or the authentication service. Supabase Auth handles password sign-in; the ClearWire profile table does not hold the password field.</li>
          <li><strong>Vendor and payment records:</strong> vendor names, addresses and contact details, bank account/routing details, amounts, currencies, payment purposes, uploaded invoices and vendor-change documents, risk signals, approval decisions, callback notes and investigation notes. Authorized users enter this information, including information about people who do not have an account.</li>
          <li><strong>Passkeys and devices:</strong> WebAuthn credential identifiers and public keys, authenticator counters and flags, device labels, browser, operating-system and device-type details. The app may record an approximate country supplied by the hosting/proxy request at registration. The passkey private key and device biometric or PIN are not sent to ClearWire by this flow.</li>
          <li><strong>Activity and support records:</strong> workflow events, timestamps, actors, policy changes, support interventions when logged, notice-version acknowledgements, and submitted deletion-review requests. Support invoice replacement can preserve the prior invoice in restricted support storage.</li>
          <li><strong>Connection and service information:</strong> authentication sessions and request metadata processed by the app, host and other providers. Infrastructure providers may process IP addresses, delivery records and diagnostic logs even where the app does not explicitly store those fields in a workspace audit event.</li>
        </ul>
        <p className="mt-3">Use only the data approved in the written pilot plan. Do not provide bank login credentials, card security codes, private keys, children’s information, or unrelated sensitive personal information.</p>
      </section>

      <section aria-labelledby="privacy-purposes">
        <h2 id="privacy-purposes" className="text-xl font-semibold text-[#203329]">3. Purposes and review signals</h2>
        <p className="mt-3">The app uses information to authenticate users, manage workspaces and invitations, compare wire requests with vendor information, apply review rules, route approvals, show exceptions, produce available reports, support troubleshooting, and record activity and privacy requests. Configured providers also deliver invitations and operational notifications.</p>
        <p className="mt-3">Risk scoring and the Compliance Hub help people prioritize review. Some workflow rules can change a request’s state inside the app. ClearWire is not connected to your bank and cannot block or automatically detect payments made outside the app, including payments made by accounts-payable staff without a ClearWire approval. A flag is not a fraud finding, and the absence of a flag is not approval to rely on a request. Ask your workspace administrator to review inaccurate information or disputed decisions; the current app does not offer a separate automated-decision appeal portal.</p>
        <p className="mt-3">The reviewed app code has no advertising-targeting or sale-of-data integration. This notice does not authorize sale of workspace records, use of customer records in public demos, or unrelated marketing. Any proposed new purpose must be assessed and appropriately disclosed before use.</p>
      </section>

      <section aria-labelledby="privacy-access">
        <h2 id="privacy-access" className="text-xl font-semibold text-[#203329]">4. Who may access records</h2>
        <p className="mt-3">Workspace users may see records according to their assigned roles and the app’s access controls. Your organization manages its members. Authorized reviewers can see recorded activity, including deletion-review requests; submitting that form is not a private message to the operator.</p>
        <p className="mt-3">Authorized ClearWire operators may access workspace information and invoices for support, make corrections to app records, manage workspace settings and revoke app-device access. These operator-only tools are not available to customer organizations or their workspace administrators and do not connect to a bank. Agree the scope of support access before a live-data pilot. Customer-visible history may not include every operator support action and is not a complete access or change log.</p>
        <p className="mt-3">Downloading a CSV or PDF or sharing an invoice link creates an additional disclosure or copy under the recipient’s control. Do not send exports or support materials to people who are not authorized to receive them.</p>
      </section>

      <section aria-labelledby="privacy-providers">
        <h2 id="privacy-providers" className="text-xl font-semibold text-[#203329]">5. Providers, messages and hosting locations</h2>
        <ul className="mt-3 list-disc space-y-2 pl-6 marker:text-[#66896a]">
          <li><strong>Supabase:</strong> account authentication, the application database, and storage for uploaded documents and preserved invoice files.</li>
          <li><strong>Resend:</strong> invitation and operational email delivery. Messages can contain recipient addresses, workflow details and action links. Users can disable supported operational email notifications in their profile; account and invitation messages are separate flows.</li>
          <li><strong>Twilio, when configured:</strong> SMS to the configured CFO number. The current wire notification can include a vendor name, amount and approval link. Confirm the recipient and permitted message content before enabling it.</li>
          <li><strong>The selected hosting/network provider:</strong> application delivery and operational request processing. Passkey registration reads country headers when present, including Vercel headers where that platform is used.</li>
        </ul>
        <p className="mt-3">The actual provider accounts, subprocessors, database/storage regions and backup locations depend on the deployment and have not been verified by this repository review. Information may be processed outside your country depending on those choices. Confirm locations, provider terms, and any legally required transfer safeguards or data-processing agreements before a live-data pilot; this notice makes no data-residency or transfer-certification promise.</p>
        <p className="mt-3">The operator may also need to disclose information where legally required or to address abuse or a security incident, subject to applicable law and its agreements. This is not permission for unrestricted access or unrelated use.</p>
      </section>

      <section aria-labelledby="privacy-cookies">
        <h2 id="privacy-cookies" className="text-xl font-semibold text-[#203329]">6. Cookies and security limitations</h2>
        <p className="mt-3">The app uses Supabase authentication cookies. No advertising or marketing-analytics tags are included in the reviewed app code. The <a className="font-semibold text-[#315741] underline underline-offset-4" href="/cookies">Cookie Notice</a> explains cookie names, session renewal and the informational banner.</p>
        <p className="mt-3">Access controls and passkeys do not make the pilot risk-free. Known readiness issues and deployment settings must be addressed before live-data approval. No security certification, guaranteed fraud prevention, or guarantee that every administrative action is logged is made by this notice. Report suspected unauthorized access through the operator contact and your workspace administrator without sending passwords or bank credentials.</p>
      </section>

      <section aria-labelledby="privacy-retention">
        <h2 id="privacy-retention" className="text-xl font-semibold text-[#203329]">7. Retention and the end of a pilot</h2>
        <p className="mt-3">This build has no automatic retention schedule, complete self-service account deletion, or pilot-end purge. Account and workspace records, invoices, preserved invoice originals, activity history and provider backups may remain after sign-out, a pilot’s end, or an account-deletion request. Revoking a device or ending access does not itself delete those records.</p>
        <p className="mt-3">Before live data is accepted, the parties must agree retention periods, authorized exports, how deletion/return will be performed, and any narrowly applicable legal or operational retention needs. Provider backup deletion and log retention must also be checked. The operator should explain any information it must retain and why; an audit-history design does not by itself override applicable privacy rights.</p>
      </section>

      <section aria-labelledby="privacy-rights">
        <h2 id="privacy-rights" className="text-xl font-semibold text-[#203329]">8. Requests and your rights</h2>
        <p className="mt-3">Depending on applicable law, you may have rights to access, correct, delete or obtain a copy of personal information, restrict or object to processing, withdraw consent where processing relies on it, or complain to a relevant privacy authority. These rights and any permitted exceptions depend on the circumstances. Contact your workspace administrator and the privacy contact shown above; identity or authority may need to be verified. Do not send identity documents unless a suitable, secure verification method is agreed.</p>
        <p className="mt-3">Signed-in users can use the <a className="font-semibold text-[#315741] underline underline-offset-4" href="/privacy/data-request">data-request page</a> to record a deletion-review request for their own account. The form writes an audit entry only: it does not delete data, send an email, open a processing queue, or notify the operator. Follow up directly. Contact the operator directly for other requests, if you cannot sign in, or if you are a vendor contact without an account.</p>
        <p className="mt-3">A monitored contact and a process for responding within applicable legal deadlines must be established before live personal data is accepted. This draft does not promise an invented response time or require you to waive statutory rights. If the operator details above are missing, this page is not yet a complete public privacy-request channel.</p>
      </section>

      <section aria-labelledby="privacy-children">
        <h2 id="privacy-children" className="text-xl font-semibold text-[#203329]">9. Children and notice changes</h2>
        <p className="mt-3">The pilot is intended for adult business users, not children under 18. If a child’s information has been added, contact the workspace administrator and operator.</p>
        <p className="mt-3">The notice must be reviewed when data uses, features, providers, regions or retention arrangements change. The version date identifies this text, not proof of existing users’ acceptance. Material changes should be communicated through the agreed pilot channel, with separate consent or agreement obtained where required. Existing users are not automatically asked to acknowledge a new version by this build.</p>
      </section>
    </PolicyDocument>
  );
}
