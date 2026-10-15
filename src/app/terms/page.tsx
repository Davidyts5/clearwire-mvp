import type { Metadata } from 'next';
import PolicyDocument from '@/components/PolicyDocument';
import LegalOperatorNotice from '@/components/LegalOperatorNotice';
import { TERMS_VERSION } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Pilot Terms of Use | ClearWire',
  description: 'Early-access terms for evaluating ClearWire payment-request review and approval workflows.',
};

export default function TermsPage() {
  return (
    <PolicyDocument title="Pilot terms of use" description="Conditions for a limited, business-to-business evaluation of ClearWire.">
      <p className="rounded-lg border border-[#d7c8a9] bg-[#fbf7ed] p-4 text-sm leading-6 text-[#594d3e]">
        Early-access draft · version {TERMS_VERSION}. These terms do not certify production readiness. Complete the operator details, agree a written pilot plan, and obtain appropriate legal and security review before onboarding customers or accepting live payment data. Until then, use fictional or properly anonymized test data only.
      </p>

      <LegalOperatorNotice />

      <section aria-labelledby="terms-scope">
        <h2 id="terms-scope" className="text-xl font-semibold text-[#203329]">1. The service and your agreement</h2>
        <p className="mt-3">ClearWire helps a business collect wire requests, review vendor changes, apply internal approval rules, and examine exceptions and recorded activity. These terms apply to the organization participating in the pilot and its authorized adult users. If you accept for an organization, you must have authority to do so.</p>
        <p className="mt-3">ClearWire is not a bank or payment provider. It does not hold funds, connect to your bank to execute a transfer, or initiate or release payments. An app approval is an internal workflow record, not a bank instruction or confirmation that money has moved. The service is not legal, accounting, investment, or regulatory advice.</p>
      </section>

      <section aria-labelledby="terms-pilot">
        <h2 id="terms-pilot" className="text-xl font-semibold text-[#203329]">2. Pilot access, duration and scope</h2>
        <p className="mt-3">Pilot participation requires an arrangement with the operator. The written pilot plan should identify the participating organization, authorized users, start and end dates, permitted data, evaluation goals, support contact, and any fees. These terms do not themselves enroll you or grant access to another workspace.</p>
        <p className="mt-3">The intended pilot model is invitation-led. A publicly reachable registration page is not approval to run a live pilot; invitation-only access is not yet enforced throughout this build. Only use an organization’s workspace with its authorization. A signed pilot agreement takes precedence over these general terms where it expressly addresses the same subject, subject to applicable law.</p>
      </section>

      <section aria-labelledby="terms-data">
        <h2 id="terms-data" className="text-xl font-semibold text-[#203329]">3. Permitted data and customer responsibilities</h2>
        <p className="mt-3">Use fictional or properly anonymized data unless the operator and your organization have expressly approved a defined live-data scope in writing after security review and any necessary data-processing agreement. A trial invitation or payment of a pilot fee is not that approval. Do not use ClearWire as your sole control for a live payment.</p>
        <p className="mt-3">Never upload online-banking passwords, bank authentication codes, payment-card security codes, private cryptographic keys, or unrelated sensitive personal information. You are responsible for lawful collection and sharing of the information you provide, its accuracy, and maintaining your own records and payment controls.</p>
        <p className="mt-3">Protect credentials and passkeys, review users and approval limits, and verify bank-detail changes using a trusted contact channel independent of the change request. Do not access other workspaces, bypass permissions, introduce malicious content, or test security without written authorization. Report suspected misuse through the pilot contact agreed with the operator.</p>
      </section>

      <section aria-labelledby="terms-decisions">
        <h2 id="terms-decisions" className="text-xl font-semibold text-[#203329]">4. Human decisions and product limitations</h2>
        <p className="mt-3">Risk scores, exception badges and vendor-change signals help prioritize review. They can be incorrect, incomplete, or absent and are not findings of fraud. Human reviewers remain responsible for decisions and for following their organization’s banking and approval procedures.</p>
        <p className="mt-3">Passkeys authenticate an app action; they do not establish that a vendor or invoice is genuine. Reports and audit-chain checks are not independent certifications of security, regulatory compliance, or the completeness of business activity. ClearWire does not guarantee prevention of fraud, recovery of funds, or any particular financial outcome.</p>
      </section>

      <section aria-labelledby="terms-support">
        <h2 id="terms-support" className="text-xl font-semibold text-[#203329]">5. Support access and history limitations</h2>
        <p className="mt-3">Privileged support features can inspect workspace records and invoices, correct vendor details, replace invoices while preserving prior files in restricted support storage, override wire states, change workspace settings, and revoke devices. Agree permitted support access and correction procedures in the pilot plan.</p>
        <p className="mt-3">The current build includes a privileged support option called Ghost Mode. When enabled, the affected support actions bypass the workspace WORM audit ledger and do not appear in customer-visible history. A valid audit chain therefore does not establish that every intervention was recorded. Do not use this pilot where a complete, immutable record of all administrative changes is required; agree an appropriate configuration and controls before live use.</p>
      </section>

      <section aria-labelledby="terms-fees">
        <h2 id="terms-fees" className="text-xl font-semibold text-[#203329]">6. Fees, renewal and refunds</h2>
        <p className="mt-3">Any pilot price, currency, taxes, payment schedule, cancellation rights and refund terms must be disclosed and agreed in a separate written pilot agreement before payment. The app has no integrated checkout or subscription billing. That does not mean every pilot is free, and these terms do not authorize a charge.</p>
        <p className="mt-3">A pilot does not automatically renew or convert to a paid production subscription under these terms. Any extension or paid conversion requires a further written agreement. Refunds and fees on early termination follow the agreed pilot terms and any mandatory rights under applicable law.</p>
      </section>

      <section aria-labelledby="terms-content">
        <h2 id="terms-content" className="text-xl font-semibold text-[#203329]">7. Workspace information and feedback</h2>
        <p className="mt-3">Your organization retains its rights in information it provides. It authorizes the operator and relevant service providers to process that information as needed to deliver, support, and secure the agreed pilot, subject to the privacy notice and applicable agreements. These terms do not transfer ownership of customer records to ClearWire or authorize their use in public demonstrations.</p>
        <p className="mt-3">You may provide product feedback for consideration in improving ClearWire. Do not include confidential third-party material in feedback unless you are authorized to share it. Use of third-party software remains subject to its applicable license notices.</p>
      </section>

      <section aria-labelledby="terms-ending">
        <h2 id="terms-ending" className="text-xl font-semibold text-[#203329]">8. Support, suspension and ending a pilot</h2>
        <p className="mt-3">Pilot features may change or be unavailable. No uptime, response-time, backup, or recovery service level is promised by these terms. Support hours and any commitments must be agreed in writing. Keep independent copies of important information.</p>
        <p className="mt-3">The operator may restrict or suspend access to address misuse, a security concern, a legal requirement, or a material breach of the pilot terms. Either party may end the pilot as set out in the written agreement. At the agreed end date, stop using the service unless an extension has been agreed.</p>
        <p className="mt-3">Arrange available exports and the return or deletion of permitted pilot data before access ends. Export features do not constitute a complete backup. Closing access or submitting a deletion request does not automatically erase records, audit history, preserved invoices, or provider backups. A retention and deletion plan must be agreed before live data is accepted.</p>
      </section>

      <section aria-labelledby="terms-legal">
        <h2 id="terms-legal" className="text-xl font-semibold text-[#203329]">9. Early-access status and legal protections</h2>
        <p className="mt-3">This is evaluation software, not a production-readiness or compliance certification. Except for commitments expressly made in the written pilot agreement and rights that cannot lawfully be excluded, the pilot is offered as available, without a promise that it will be uninterrupted, error-free, or suitable for every use.</p>
        <p className="mt-3">These draft terms do not set a monetary liability cap, choose a governing jurisdiction, or require arbitration. Any allocation of liability and dispute procedure must be settled with the identified operator in the written pilot agreement and reviewed for the applicable law. Nothing in these terms excludes liability or rights that cannot lawfully be excluded.</p>
      </section>

      <section aria-labelledby="terms-acceptance">
        <h2 id="terms-acceptance" className="text-xl font-semibold text-[#203329]">10. Privacy, acceptance and changes</h2>
        <p className="mt-3">Read the <a className="font-semibold text-[#315741] underline underline-offset-4" href="/privacy">Privacy Notice</a>, <a className="font-semibold text-[#315741] underline underline-offset-4" href="/cookies">Cookie Notice</a>, and <a className="font-semibold text-[#315741] underline underline-offset-4" href="/third-party-notices">third-party notices</a>. ClearWire is intended for business users aged 18 or over, not children.</p>
        <p className="mt-3">The workspace-creation and invitation forms require agreement to these terms and acknowledgement of the privacy notice. Their completion flows record the versions and acceptance time in the workspace audit history. Acknowledgement of a privacy notice is not blanket consent to every use of personal information.</p>
        <p className="mt-3">A new notice date does not prove existing users have accepted revised terms. This build has no automatic reacceptance workflow. Material changes to an agreed pilot must be communicated and any necessary agreement obtained before they apply. Keep a copy of the terms and written pilot plan you accept.</p>
      </section>
    </PolicyDocument>
  );
}
