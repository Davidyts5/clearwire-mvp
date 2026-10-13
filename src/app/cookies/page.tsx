import type { Metadata } from 'next';
import PolicyDocument from '@/components/PolicyDocument';
import { COOKIE_NOTICE_VERSION } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Cookie Notice | ClearWire',
  description: 'Cookie and browser storage details for the ClearWire demo.',
};

export default function CookiesPage() {
  return (
    <PolicyDocument
      title="Cookie notice"
      description="The current app uses browser storage only where needed for sign-in and session handling."
    >
      <p className="rounded-lg border border-[#d7c8a9] bg-[#fbf7ed] p-4 text-sm leading-6 text-[#594d3e]">
        This notice describes the current demo build (version {COOKIE_NOTICE_VERSION}). Reassess it if optional analytics, advertising, chat, experimentation or other browser-storage tools are added.
      </p>

      <section aria-labelledby="cookies-essential">
        <h2 id="cookies-essential" className="text-xl font-semibold text-[#203329]">Essential sign-in cookies</h2>
        <p className="mt-3">ClearWire uses Supabase authentication cookies to maintain sign-in state and protect access to workspace pages. The current app configuration sets a one-hour maximum age for its authentication cookies and clears them when a user signs out. Authentication will not work as intended if those cookies are blocked.</p>
      </section>

      <section aria-labelledby="cookies-tracking">
        <h2 id="cookies-tracking" className="text-xl font-semibold text-[#203329]">Analytics and advertising</h2>
        <p className="mt-3">The app code reviewed for this build does not include third-party advertising or marketing-analytics tags and does not intentionally set analytics or advertising cookies. ClearWire includes operational risk analytics based on workspace payment-request data; that is an app feature, not an advertising tracker.</p>
      </section>

      <section aria-labelledby="cookies-notice">
        <h2 id="cookies-notice" className="text-xl font-semibold text-[#203329]">Cookie information banner</h2>
        <p className="mt-3">The banner is informational because the current app uses essential sign-in cookies only. Dismissing it changes React page state for the current page session; the dismissal is not written to a cookie or local storage. It does not provide consent for optional tracking. If non-essential storage is introduced, the banner and consent behavior must be reviewed before enabling it.</p>
      </section>

      <section aria-labelledby="cookies-providers">
        <h2 id="cookies-providers" className="text-xl font-semibold text-[#203329]">Provider processing</h2>
        <p className="mt-3">Hosting and authentication providers may process connection or session information to operate their services. Their own browser storage, logging and retention behavior depends on the selected deployment and provider configuration. See the <a className="font-semibold text-[#315741] underline underline-offset-4" href="/privacy">Privacy Notice</a> and confirm the live configuration before public use.</p>
      </section>
    </PolicyDocument>
  );
}
