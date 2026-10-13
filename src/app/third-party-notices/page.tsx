import type { Metadata } from 'next';
import PolicyDocument from '@/components/PolicyDocument';

export const metadata: Metadata = {
  title: 'Third-party notices | ClearWire',
  description: 'Third-party asset and service inventory for the ClearWire demo.',
};

export default function ThirdPartyNoticesPage() {
  return (
    <PolicyDocument
      title="Third-party notices"
      description="A short inventory of external services and visual assets identified in the current repository review."
    >
      <p className="rounded-lg border border-[#d7c8a9] bg-[#fbf7ed] p-4 text-sm leading-6 text-[#594d3e]">
        This inventory was prepared from the checked-in app code and package manifest on 12 October 2026. It is not a complete software bill of materials; review the lockfile and deployed configuration before release.
      </p>

      <section aria-labelledby="third-party-assets">
        <h2 id="third-party-assets" className="text-xl font-semibold text-[#203329]">Visual assets</h2>
        <ul className="mt-3 list-disc space-y-3 pl-6 marker:text-[#66896a]">
          <li><strong>Lucide React icons:</strong> the app imports icons from <code>lucide-react</code> (ISC license). See the package’s license and upstream project at <a className="font-semibold text-[#315741] underline underline-offset-4" href="https://github.com/lucide-icons/lucide/blob/main/LICENSE">Lucide’s license file</a>.</li>
          <li><strong>Inter typeface:</strong> the app requests Inter through Next.js <code>next/font/google</code>. Inter is distributed under the SIL Open Font License 1.1; see the <a className="font-semibold text-[#315741] underline underline-offset-4" href="https://github.com/google/fonts/tree/main/ofl/inter">upstream Inter font directory</a> for its notice.</li>
          <li><strong>Images:</strong> no third-party stock-image files were found in the current <code>public</code> asset directory. The landing-page payment screen is an HTML/CSS illustration, labeled illustrative, and is not a customer record.</li>
        </ul>
      </section>

      <section aria-labelledby="third-party-services">
        <h2 id="third-party-services" className="text-xl font-semibold text-[#203329]">External service integrations</h2>
        <p className="mt-3">The current app code integrates with Supabase for authentication, database and file storage; Resend for email; and Twilio for optional SMS when configured. Hosting can use Vercel, whose location headers are read during passkey registration when present. Their service terms and privacy documentation are separate from ClearWire’s app notices; see the <a className="font-semibold text-[#315741] underline underline-offset-4" href="/privacy">Privacy Notice</a>.</p>
      </section>

      <section aria-labelledby="third-party-review">
        <h2 id="third-party-review" className="text-xl font-semibold text-[#203329]">Review limits</h2>
        <p className="mt-3">A source search found no third-party advertising or marketing-analytics SDK in this build. The app uses its own risk and audit analytics features. New packages, scripts, hosted widgets, fonts or providers must be reviewed for license, privacy and cookie impact before they are enabled.</p>
      </section>
    </PolicyDocument>
  );
}
