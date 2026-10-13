import type { Metadata } from 'next';
import PolicyDocument from '@/components/PolicyDocument';
import LegalOperatorNotice from '@/components/LegalOperatorNotice';
import { PRIVACY_NOTICE_VERSION } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Privacy Notice | ClearWire',
  description: 'How the ClearWire demonstration handles account, vendor, payment-request, and passkey data.',
};

export default function PrivacyPage() {
  return (
    <PolicyDocument
      title="Privacy notice"
      description="A plain-language description of data used by the current ClearWire B2B payment-request review demo."
    >
      <p className="rounded-lg border border-[#d7c8a9] bg-[#fbf7ed] p-4 text-sm leading-6 text-[#594d3e]">
        This is a working notice for the current demo build (version {PRIVACY_NOTICE_VERSION}). The legal operator, contact and retention arrangements must be completed and reviewed before public or production use. Do not submit live bank credentials or real payment instructions to a demo environment.
      </p>

      <LegalOperatorNotice />

      <section aria-labelledby="privacy-role">
        <h2 id="privacy-role" className="text-xl font-semibold text-[#203329]">1. Who controls the information</h2>
        <p className="mt-3">A business creates a ClearWire workspace and its members may enter information about that business, its staff, vendors and payment requests. The workspace administrator manages membership and access. The roles of the business and the ClearWire operator depend on the deployment and agreements in place; those arrangements have not been configured in this demo.</p>
      </section>

      <section aria-labelledby="privacy-data">
        <h2 id="privacy-data" className="text-xl font-semibold text-[#203329]">2. Information the app handles</h2>
        <ul className="mt-3 list-disc space-y-2 pl-6 marker:text-[#66896a]">
          <li><strong>Workspace and account information:</strong> company name, full name, business email, role, approval limits, invitation status and email-notification preference. Password sign-in is handled through Supabase Auth; the ClearWire profile table does not contain the password field.</li>
          <li><strong>Vendor and payment-request information:</strong> vendor and contact details, bank account/routing information, amount, currency, payment purpose, invoice files, request status, risk flags, approval decisions, callback-verification notes and related audit events. These fields can contain sensitive business or personal information.</li>
          <li><strong>Passkey and device information:</strong> a WebAuthn credential identifier and public key, authenticator counters and flags, and a device label. The app also records coarse browser, operating-system and device-type details and, when the hosting request provides it, the approximate country at passkey registration. The private passkey and device biometric/PIN are not sent to ClearWire by this flow.</li>
          <li><strong>Service and connection information:</strong> authentication/session data and ordinary request metadata handled by the app and its infrastructure providers. The current app code does not deliberately add an IP address to audit events; hosting, authentication or email providers may process network data in their own operations and logs.</li>
        </ul>
        <p className="mt-3">Only enter information needed for the demonstration and your workspace’s review workflow. Do not enter online-banking passwords, card security codes or other credentials for a financial institution.</p>
      </section>

      <section aria-labelledby="privacy-use">
        <h2 id="privacy-use" className="text-xl font-semibold text-[#203329]">3. Why the app uses it</h2>
        <p className="mt-3">The app uses this information to create accounts and workspaces, authenticate members, compare a payment request with vendor information, apply workspace-configured review rules, support approval and callback workflows, maintain an audit history, and send operational email or SMS notifications when configured.</p>
        <p className="mt-3">Risk flags are workflow signals, not a guarantee that fraud will be identified or prevented. ClearWire does not connect to a bank, initiate or release a transfer, or replace the workspace’s own payment controls.</p>
      </section>

      <section aria-labelledby="privacy-providers">
        <h2 id="privacy-providers" className="text-xl font-semibold text-[#203329]">4. Service providers and sharing</h2>
        <ul className="mt-3 list-disc space-y-2 pl-6 marker:text-[#66896a]">
          <li><strong>Supabase:</strong> authentication, application database and invoice-file storage used by the app.</li>
          <li><strong>Resend:</strong> invitation and operational notification email.</li>
          <li><strong>Twilio (optional):</strong> if the deployment configures Twilio, the app can send a wire-request notification containing the vendor name, amount and approval link to the configured CFO phone number.</li>
          <li><strong>Hosting and network provider:</strong> the deployment provider serves the app. Passkey registration may use country information supplied in the hosting/proxy headers. Vercel headers are used when deployed on Vercel.</li>
        </ul>
        <p className="mt-3">The app code reviewed for this notice contains no third-party advertising or marketing-analytics SDK. ClearWire does not sell workspace records or use them for ad targeting. Provider-side operational logs and any services enabled outside this repository are governed by the applicable deployment configuration and provider terms; verify those before launch.</p>
      </section>

      <section aria-labelledby="privacy-cookies">
        <h2 id="privacy-cookies" className="text-xl font-semibold text-[#203329]">5. Cookies and browser storage</h2>
        <p className="mt-3">This build uses essential Supabase authentication/session cookies to sign in and maintain a session. The cookie notice’s dismiss state is held only in page memory and is not saved as a cookie or local-storage preference. No advertising or third-party analytics cookies are intentionally added by the app code reviewed here. See the <a className="font-semibold text-[#315741] underline underline-offset-4" href="/cookies">Cookie notice</a> for details.</p>
      </section>

      <section aria-labelledby="privacy-retention">
        <h2 id="privacy-retention" className="text-xl font-semibold text-[#203329]">6. Retention and account requests</h2>
        <p className="mt-3">This demo has no configured retention schedule or automatic account-deletion process. Workspace records, uploaded invoices and audit history may remain until an authorized workspace or service operator handles them. Audit history is designed to retain a record of decisions; a deletion request does not automatically remove those records.</p>
        <p className="mt-3">A signed-in user can record an account-deletion review request from the <a className="font-semibold text-[#315741] underline underline-offset-4" href="/privacy/data-request">data-request page</a>. The request is added to the workspace audit history and is visible to authorized workspace audit users. It does not delete data or notify an operator in this demo. Follow up with your workspace administrator and the configured privacy contact.</p>
        <p className="mt-3">Access, correction or other requests should be directed to the workspace administrator and the operator listed above. Available rights and response procedures depend on the deployment and applicable law; they have not been implemented as a self-service workflow in this demo.</p>
      </section>

      <section aria-labelledby="privacy-children">
        <h2 id="privacy-children" className="text-xl font-semibold text-[#203329]">7. Children</h2>
        <p className="mt-3">ClearWire is a business workflow demo and is not designed for children under 18. Do not create an account for a child or enter children’s personal information. If you believe a child’s information was added, contact the workspace administrator and the configured privacy contact.</p>
      </section>

      <section aria-labelledby="privacy-changes">
        <h2 id="privacy-changes" className="text-xl font-semibold text-[#203329]">8. Changes to this notice</h2>
        <p className="mt-3">This notice may need updating when providers, features, hosting regions, data fields or retention processes change. The current version date appears above. Re-check it before each external release; this repository review does not establish the live database or provider configuration.</p>
      </section>
    </PolicyDocument>
  );
}
