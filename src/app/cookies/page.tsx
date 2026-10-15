import type { Metadata } from 'next';
import PolicyDocument from '@/components/PolicyDocument';
import LegalOperatorNotice from '@/components/LegalOperatorNotice';
import { COOKIE_NOTICE_VERSION } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Pilot Cookie Notice | ClearWire',
  description: 'Essential authentication cookies, session renewal, and browser-storage choices in the ClearWire pilot.',
};

export default function CookiesPage() {
  return (
    <PolicyDocument title="Cookie notice" description="Cookies and browser storage in the current ClearWire early-access build.">
      <p className="rounded-lg border border-[#d7c8a9] bg-[#fbf7ed] p-4 text-sm leading-6 text-[#594d3e]">
        Pilot draft · version {COOKIE_NOTICE_VERSION}. This inventory is based on the app code, not a scan of a deployed customer browser. Confirm the deployed cookie names, lifetimes, host settings and provider behavior before a customer pilot and whenever integrations change.
      </p>

      <LegalOperatorNotice />

      <section aria-labelledby="cookies-inventory">
        <h2 id="cookies-inventory" className="text-xl font-semibold text-[#203329]">1. Essential authentication storage</h2>
        <p className="mt-3">ClearWire uses Supabase’s browser/server authentication integration to maintain sign-in state. These cookies are used for the requested account service, not advertising. They contain sensitive authentication information; do not copy their values into email, support messages or screenshots.</p>
        <div className="mt-4 overflow-x-auto rounded-lg border border-[#dedfd6] bg-white">
          <table className="w-full min-w-[580px] text-left text-sm leading-6">
            <caption className="sr-only">Expected authentication cookies and other browser state</caption>
            <thead className="bg-[#eff1ea]"><tr><th scope="col" className="p-3">Name or pattern</th><th scope="col" className="p-3">Purpose / provider</th><th scope="col" className="p-3">Lifetime / behavior</th></tr></thead>
            <tbody className="divide-y divide-[#dedfd6]">
              <tr><th scope="row" className="p-3 align-top font-mono font-normal">{'sb-<project-ref>-auth-token'}</th><td className="p-3 align-top">Supabase sign-in/session state on the app domain. Larger values may be split into numbered cookies such as <code>.0</code> and <code>.1</code>.</td><td className="p-3 align-top">Renewable. The client and middleware request a 3,600-second lifetime on their cookie writes; other server-side writes use the authentication provider’s options. This is not a guaranteed absolute one-hour session limit.</td></tr>
              <tr><th scope="row" className="p-3 align-top font-mono font-normal">{'sb-<project-ref>-auth-token-code-verifier'}</th><td className="p-3 align-top">Supabase authentication-flow verification if a PKCE-based flow is used. Not necessarily present in every session.</td><td className="p-3 align-top">Created/removed by the authentication library as the relevant flow progresses; expiry depends on its cookie options and deployed configuration.</td></tr>
              <tr><th scope="row" className="p-3 align-top font-normal">Cookie-banner dismissal</th><td className="p-3 align-top">In-memory page state only; not a stored tracking or consent preference.</td><td className="p-3 align-top">Lost on reload or when the component is remounted. No dismissal cookie or local-storage entry is written.</td></tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3">The project reference and exact names depend on the Supabase project and SDK configuration. Refreshing authentication can renew cookies. Cookie expiry, access-token expiry, inactivity sign-out and server-side data retention are different things.</p>
      </section>

      <section aria-labelledby="cookies-choices">
        <h2 id="cookies-choices" className="text-xl font-semibold text-[#203329]">2. Your choices and sign-out</h2>
        <p className="mt-3">You can inspect, block or clear cookies through your browser’s site/privacy settings. Blocking essential authentication cookies can prevent sign-in or interrupt authenticated features. Signing out asks Supabase to end the session and the app attempts to clear its authentication cookies. On a shared device, sign out and close the browser when finished.</p>
        <p className="mt-3">Clearing cookies or signing out does not delete your account, workspace records, uploaded documents or provider logs. For personal-data requests, see the <a className="font-semibold text-[#315741] underline underline-offset-4" href="/privacy/data-request">data-request page</a>.</p>
      </section>

      <section aria-labelledby="cookies-banner">
        <h2 id="cookies-banner" className="text-xl font-semibold text-[#203329]">3. The informational banner</h2>
        <p className="mt-3">The banner explains the current essential-cookie use. Its dismiss button closes the notice; it is not an “accept all” control, does not record consent, and does not authorize optional tracking. It may reappear after a reload. The app does not currently offer a preference center for optional cookies because no optional advertising or marketing-analytics tags are included in the reviewed app code.</p>
      </section>

      <section aria-labelledby="cookies-tracking">
        <h2 id="cookies-tracking" className="text-xl font-semibold text-[#203329]">4. Analytics, third parties and fonts</h2>
        <p className="mt-3">ClearWire’s risk analytics and exception reports use workspace records; they are product features, not advertising trackers. The reviewed app code does not include third-party advertising or marketing-analytics scripts. That statement does not cover tools added separately through a hosting dashboard, proxy, embedded widget or customer deployment.</p>
        <p className="mt-3">Inter is configured through Next.js <code>next/font/google</code>, which obtains fonts during the build and serves the generated font assets with the app; it is not a Google Analytics integration. Hosting and authentication providers can still process ordinary connection and session information.</p>
        <p className="mt-3">Before adding optional analytics, advertising, chat, experimentation or other non-essential browser storage, update this inventory and implement any consent or opt-out controls required for the deployment. This informational banner does not provide those controls.</p>
      </section>

      <section aria-labelledby="cookies-contact">
        <h2 id="cookies-contact" className="text-xl font-semibold text-[#203329]">5. Questions and updates</h2>
        <p className="mt-3">Use the operator’s privacy contact above for questions, or contact your workspace administrator. Read the <a className="font-semibold text-[#315741] underline underline-offset-4" href="/privacy">Privacy Notice</a> for data uses, providers, retention and requests. Review this notice and the actual deployed browser behavior whenever the pilot configuration changes.</p>
      </section>
    </PolicyDocument>
  );
}
