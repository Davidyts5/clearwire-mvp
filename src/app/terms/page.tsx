import type { Metadata } from 'next';
import PolicyDocument from '@/components/PolicyDocument';
import LegalOperatorNotice from '@/components/LegalOperatorNotice';
import { TERMS_VERSION } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Terms of Use | ClearWire',
  description: 'Terms for the ClearWire payment-request review demonstration.',
};

export default function TermsPage() {
  return (
    <PolicyDocument
      title="Terms of use"
      description="Conditions for using the current ClearWire B2B payment-request review demonstration."
    >
      <p className="rounded-lg border border-[#d7c8a9] bg-[#fbf7ed] p-4 text-sm leading-6 text-[#594d3e]">
        These working terms (version {TERMS_VERSION}) describe the current demo, not a production financial service. The operator details below must be completed and these terms reviewed before public or production use.
      </p>

      <LegalOperatorNotice />

      <section aria-labelledby="terms-demo">
        <h2 id="terms-demo" className="text-xl font-semibold text-[#203329]">1. What ClearWire does</h2>
        <p className="mt-3">ClearWire is a B2B demonstration of an internal payment-request review workflow. It can record vendor information, payment-request details, review signals, passkey-confirmed approvals and an audit history.</p>
        <p className="mt-3">ClearWire does not connect to a bank, initiate or execute a payment, hold funds, or replace a bank or payment provider. An approval recorded in ClearWire is an internal workflow record; it is not a bank instruction, a guarantee that a payment will be made, or confirmation that funds have moved.</p>
      </section>

      <section aria-labelledby="terms-demo-use">
        <h2 id="terms-demo-use" className="text-xl font-semibold text-[#203329]">2. Demo use and information entered</h2>
        <p className="mt-3">Use this build for demonstration and testing only. Do not rely on it as the sole control for a live payment, and do not upload live vendor banking details, bank credentials or real payment instructions unless the deployment has been reviewed and expressly approved for that use.</p>
        <p className="mt-3">Workspace members must be authorized by their organization. You are responsible for entering accurate information, using only data your organization is allowed to provide, protecting sign-in credentials and passkeys, and checking any approval independently through your organization’s established process.</p>
      </section>

      <section aria-labelledby="terms-signals">
        <h2 id="terms-signals" className="text-xl font-semibold text-[#203329]">3. Review signals and approvals</h2>
        <p className="mt-3">Risk scores and policy flags are configurable workflow aids. They can be incomplete or incorrect and do not guarantee detection or prevention of fraud, correctness of vendor details, legal or regulatory compliance, or successful payment. Human review and your organization’s controls remain necessary.</p>
        <p className="mt-3">Passkey authentication confirms a browser/device ceremony for an app action; it does not independently verify the truth of a payment request or sign an instruction at a bank.</p>
      </section>

      <section aria-labelledby="terms-accounts">
        <h2 id="terms-accounts" className="text-xl font-semibold text-[#203329]">4. Accounts and workspace access</h2>
        <p className="mt-3">Provide current business account information, keep access limited to authorized team members, and tell your workspace administrator if access should be changed. Workspace administrators manage invitations, roles and approval limits. Do not attempt to access another workspace or interfere with the service.</p>
      </section>

      <section aria-labelledby="terms-billing">
        <h2 id="terms-billing" className="text-xl font-semibold text-[#203329]">5. Fees and refunds</h2>
        <p className="mt-3">The current app build has no checkout, subscription or billing flow and does not collect a product fee. There is therefore no in-app purchase or refund process in this demo. Any future paid offering would require separately presented commercial terms before purchase.</p>
      </section>

      <section aria-labelledby="terms-availability">
        <h2 id="terms-availability" className="text-xl font-semibold text-[#203329]">6. Availability and limitations</h2>
        <p className="mt-3">This is demonstration software and may change, be incomplete, unavailable or contain errors. Do not treat generated reports, audit-chain checks, risk flags or account status as externally certified evidence or a substitute for your own records and controls.</p>
      </section>

      <section aria-labelledby="terms-privacy">
        <h2 id="terms-privacy" className="text-xl font-semibold text-[#203329]">7. Privacy, data requests and children</h2>
        <p className="mt-3">Use of the app also involves the <a className="font-semibold text-[#315741] underline underline-offset-4" href="/privacy">Privacy Notice</a> and <a className="font-semibold text-[#315741] underline underline-offset-4" href="/cookies">Cookie Notice</a>. The data-request form records a deletion-review request but does not itself delete data. ClearWire is not designed for children under 18; do not create accounts for children or enter children’s personal information.</p>
      </section>

      <section aria-labelledby="terms-acceptance">
        <h2 id="terms-acceptance" className="text-xl font-semibold text-[#203329]">8. Acceptance and updates</h2>
        <p className="mt-3">Creating a workspace or accepting an invitation requires an affirmative acknowledgement of these terms and the privacy notice. The app records the applicable notice versions and acceptance time in the workspace audit history. If you do not agree, do not create or use an account.</p>
        <p className="mt-3">The terms may change as the product changes. The displayed version date identifies this text. These working terms require review against the selected operator, deployment and applicable law before production use.</p>
      </section>
    </PolicyDocument>
  );
}
