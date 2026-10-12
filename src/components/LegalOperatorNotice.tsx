export default function LegalOperatorNotice() {
  const operatorName = process.env.CLEARWIRE_LEGAL_ENTITY_NAME?.trim();
  const privacyEmail = process.env.CLEARWIRE_PRIVACY_EMAIL?.trim();
  const businessAddress = process.env.CLEARWIRE_BUSINESS_ADDRESS?.trim();
  const missingDetails = !operatorName || !privacyEmail || !businessAddress;

  return (
    <section id="contact" aria-labelledby="operator-details-title" className="rounded-xl border border-[#d7c8a9] bg-[#fbf7ed] p-5 sm:p-6">
      <h2 id="operator-details-title" className="text-lg font-semibold tracking-tight text-[#203329]">Who operates ClearWire</h2>
      {missingDetails && (
        <p role="status" className="mt-3 rounded-lg border border-[#e4d4b6] bg-white/70 p-3 text-sm leading-6 text-[#594d3e]">
          Operator details are not fully configured in this build. This page is a product-demo draft; complete the missing details and have the notice reviewed before offering ClearWire publicly.
        </p>
      )}
      <address className="mt-4 space-y-2 text-sm not-italic leading-6 text-[#405046]">
        <p><span className="font-semibold">Legal operator:</span> {operatorName || 'Not configured'}</p>
        <p>
          <span className="font-semibold">Privacy contact:</span>{' '}
          {privacyEmail ? <a className="underline underline-offset-4" href={`mailto:${privacyEmail}`}>{privacyEmail}</a> : 'Not configured'}
        </p>
        <p><span className="font-semibold">Business address:</span> {businessAddress || 'Not configured'}</p>
      </address>
    </section>
  );
}
