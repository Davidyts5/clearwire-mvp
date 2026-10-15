import type { Metadata } from 'next';
import PolicyDocument from '@/components/PolicyDocument';
import LegalOperatorNotice from '@/components/LegalOperatorNotice';
import PrivacyRequestForm from '@/components/PrivacyRequestForm';

export const metadata: Metadata = {
  title: 'Data request | ClearWire',
  description: 'Record an account-deletion review request during a ClearWire early-access pilot.',
};

export default function PrivacyDataRequestPage() {
  const privacyEmail = process.env.CLEARWIRE_PRIVACY_EMAIL?.trim();

  return (
    <PolicyDocument
      title="Data request"
      description="Use this page to record a request for review of deletion of your own ClearWire account data."
    >
      <p className="rounded-lg border border-[#d7c8a9] bg-[#fbf7ed] p-4 text-sm leading-6 text-[#594d3e]">
        This early-access build does not have automatic account deletion or a request-processing queue. The form below creates an audit entry only; it does not erase account, vendor, payment-request or audit data and does not notify an operator.
      </p>

      <LegalOperatorNotice />

      <PrivacyRequestForm privacyEmail={privacyEmail} />

      <section aria-labelledby="request-next-steps">
        <h2 id="request-next-steps" className="text-xl font-semibold text-[#203329]">What happens next</h2>
        <p className="mt-3">The request is associated with your signed-in user and appears in the workspace audit history, where authorized workspace audit users may see it. Follow up directly with your workspace administrator and the privacy contact above. If you cannot sign in or are a vendor contact without an account, contact them directly instead. The workspace and service operator must review requests under applicable law and the agreed retention plan; audit-history entries and preserved invoices are not automatically erased. An operator contact must be configured above before this can serve as a complete public request channel.</p>
      </section>
    </PolicyDocument>
  );
}
