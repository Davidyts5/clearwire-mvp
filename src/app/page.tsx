import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  Check,
  CircleAlert,
  Fingerprint,
  History,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

export const metadata: Metadata = {
  title: "ClearWire — A second look before a wire goes out",
  description:
    "Payment request review, beneficiary checks, passkey approvals, and an auditable decision history for finance teams.",
};

const processSteps = [
  {
    number: "01",
    title: "Submit the request",
    text: "Accounts payable records the vendor, amount, purpose, and supporting invoice in one place.",
  },
  {
    number: "02",
    title: "Review what changed",
    text: "ClearWire compares beneficiary details with the vendor record and surfaces policy or risk exceptions.",
  },
  {
    number: "03",
    title: "Authorize and record",
    text: "The right approver reviews the request, signs in with a registered passkey, and leaves a traceable decision.",
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#f5f4ee] text-[#1e2b24] selection:bg-[#dce7dd] selection:text-[#1e2b24]">
      <header className="sticky top-0 z-50 border-b border-[#e3e2d9] bg-[#f5f4ee]/95 backdrop-blur">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="group flex items-center gap-3" aria-label="ClearWire home">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#315741] text-[#f7f6ef] shadow-sm">
              <ShieldCheck size={22} strokeWidth={1.8} aria-hidden="true" />
            </span>
            <span className="text-[19px] font-semibold tracking-[-0.04em] text-[#203329]">ClearWire</span>
          </Link>

          <nav aria-label="Main navigation" className="hidden items-center gap-8 md:flex">
            <Link href="#approach" className="text-sm text-[#5d685f] transition-colors hover:text-[#203329]">Approach</Link>
            <Link href="#workflow" className="text-sm text-[#5d685f] transition-colors hover:text-[#203329]">How it works</Link>
            <Link href="#controls" className="text-sm text-[#5d685f] transition-colors hover:text-[#203329]">Controls</Link>
          </nav>

          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-medium text-[#45564b] transition-colors hover:bg-[#eae9e1] hover:text-[#1e2b24]">
              Sign in
            </Link>
            <Link href="/signup" className="inline-flex items-center gap-2 rounded-lg bg-[#315741] px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#254733] sm:px-4">
              <span className="hidden sm:inline">Create workspace</span>
              <span className="sm:hidden">Get started</span>
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      <section id="top" className="relative overflow-hidden border-b border-[#e3e2d9]">
        <div className="pointer-events-none absolute -right-36 top-16 hidden h-[520px] w-[520px] rounded-full border border-[#e4e4d8] lg:block" />
        <div className="pointer-events-none absolute -right-16 top-36 hidden h-[360px] w-[360px] rounded-full border border-[#e4e4d8] lg:block" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:py-24">
          <div className="max-w-2xl">
            <div className="mb-7 inline-flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#52715c]">
              <span className="h-2 w-2 rounded-full bg-[#64876b]" aria-hidden="true" />
              Payment controls for finance teams
            </div>

            <h1 className="font-serif text-[3.25rem] leading-[0.99] tracking-[-0.055em] text-[#203329] sm:text-6xl lg:text-[4.65rem]">
              A second look
              <span className="mt-2 block font-normal italic text-[#58745f]">before a wire goes out.</span>
            </h1>

            <p className="mt-7 max-w-xl text-[16px] leading-7 text-[#59665d] sm:text-lg sm:leading-8">
              ClearWire gives accounts payable and finance teams a controlled place to review payment requests, catch beneficiary changes, and record who approved what.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="#workflow" className="group inline-flex min-h-12 items-center justify-center gap-3 rounded-lg bg-[#315741] px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#254733]">
                See the workflow
                <ArrowRight size={17} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
              <Link href="/login" className="inline-flex min-h-12 items-center justify-center rounded-lg border border-[#d5d7ce] bg-white/55 px-5 py-3 text-sm font-semibold text-[#34483a] transition-colors hover:bg-white">
                Sign in to ClearWire
              </Link>
            </div>

            <div className="mt-9 flex items-center gap-2.5 text-sm text-[#6a746c]">
              <UsersRound size={17} className="text-[#71816f]" aria-hidden="true" />
              <span>For AP clerks, controllers, CFOs, and auditors</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[620px] lg:ml-auto">
            <div className="absolute -bottom-6 -left-6 hidden h-36 w-36 rounded-full bg-[#e4e8dc] sm:block" aria-hidden="true" />
            <div className="relative overflow-hidden rounded-[22px] border border-[#dedfd5] bg-white shadow-[0_24px_70px_-32px_rgba(32,51,41,0.28)]">
              <div className="flex items-center justify-between border-b border-[#ecece5] px-5 py-4 sm:px-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#eff3ed] text-[#3f684b]">
                    <ShieldCheck size={19} strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[#27372d]">Payment review</p>
                    <p className="mt-0.5 text-[11px] text-[#899188]">SAMPLE WORKSPACE</p>
                  </div>
                </div>
                <span className="rounded-full border border-[#e5e5db] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#777f75]">Illustrative</span>
              </div>

              <div className="p-5 sm:p-7">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium text-[#899188]">Request CW-1042 · submitted today</p>
                    <h2 className="mt-2 text-xl font-semibold tracking-[-0.035em] text-[#24352a] sm:text-2xl">Meridian Parts</h2>
                    <p className="mt-1 text-sm text-[#768076]">Equipment order</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#899188]">Amount</p>
                    <p className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-[#24352a]">$48,600</p>
                    <p className="text-xs text-[#899188]">USD</p>
                  </div>
                </div>

                <div className="mt-6 rounded-xl border border-[#e6e7df] bg-[#fafaf7] p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-[#34483a]">
                      <Building2 size={16} className="text-[#68816c]" aria-hidden="true" />
                      Beneficiary details
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f7ece3] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#97613b]">
                      <CircleAlert size={13} aria-hidden="true" />
                      Needs review
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
                    <div className="rounded-lg border border-[#e5e7df] bg-white p-3 sm:p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8c948b]">On file</p>
                      <p className="mt-2 text-xs font-semibold text-[#36473b] sm:text-sm">Account ending</p>
                      <p className="mt-1 font-mono text-sm tracking-[0.13em] text-[#405c48]">•••• 0824</p>
                    </div>
                    <ArrowRight size={16} className="text-[#9ba398]" aria-hidden="true" />
                    <div className="rounded-lg border border-[#e9cbb3] bg-[#fffaf6] p-3 sm:p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#a36d46]">Request</p>
                      <p className="mt-2 text-xs font-semibold text-[#624832] sm:text-sm">Account ending</p>
                      <p className="mt-1 font-mono text-sm tracking-[0.13em] text-[#97613b]">•••• 6419</p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-start gap-3 border-t border-[#e8e9e2] pt-4">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f6e8dc] text-[#9a643f]">
                      <CircleAlert size={15} aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[#654b35]">Bank detail mismatch</p>
                      <p className="mt-1 text-xs leading-5 text-[#7c7468]">The submitted account differs from the saved vendor record. Route this request for review before approval.</p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex flex-col gap-3 border-t border-[#ecece5] pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 text-xs text-[#727d73]">
                    <Fingerprint size={16} className="text-[#53745b]" aria-hidden="true" />
                    Passkey sign-off required
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#526e57]">
                    <span className="h-2 w-2 rounded-full bg-[#66896a]" aria-hidden="true" />
                    Held for review
                  </div>
                </div>
              </div>
            </div>
            <p className="relative mt-4 text-right text-[11px] text-[#8b9289]">Illustrative payment request · no customer data</p>
          </div>
        </div>
      </section>

      <section id="approach" className="border-b border-[#e3e2d9] bg-[#eeeee6]">
        <div className="mx-auto grid max-w-7xl gap-7 px-5 py-16 sm:px-8 md:grid-cols-[0.8fr_1.2fr] md:items-center md:py-20">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#71816f]">The reason for a second look</p>
            <h2 className="mt-4 max-w-md font-serif text-3xl leading-tight tracking-[-0.04em] text-[#24362a] sm:text-4xl">
              Fraud often arrives as one small change.
            </h2>
          </div>
          <div className="max-w-2xl md:ml-auto">
            <p className="text-base leading-7 text-[#59665d] sm:text-lg sm:leading-8">
              A new account number. An urgent request. An invoice that looks familiar. ClearWire brings the payment details and the approval decision together, so a finance team can pause, compare, and review before following its existing payment process.
            </p>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-[#48634d]">
              <span className="inline-flex items-center gap-2"><Check size={15} aria-hidden="true" />Vendor record comparison</span>
              <span className="inline-flex items-center gap-2"><Check size={15} aria-hidden="true" />Risk and policy review</span>
              <span className="inline-flex items-center gap-2"><Check size={15} aria-hidden="true" />Recorded approval path</span>
            </div>
          </div>
        </div>
      </section>

      <section id="workflow" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="grid gap-10 md:grid-cols-[0.7fr_1.3fr] md:gap-16">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#71816f]">A practical workflow</p>
            <h2 className="mt-4 max-w-sm font-serif text-3xl leading-tight tracking-[-0.04em] text-[#24362a] sm:text-4xl">
              From request to recorded decision.
            </h2>
            <p className="mt-5 max-w-sm text-sm leading-6 text-[#69746b]">
              Keep the people, details, and checks around a payment in one deliberate path—not scattered across a busy inbox.
            </p>
            <Link href="/signup" className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-[#315741] transition-colors hover:text-[#1f3e2b]">
              Create a workspace <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>

          <div className="divide-y divide-[#dedfd6] border-y border-[#dedfd6]">
            {processSteps.map((step) => (
              <article key={step.number} className="grid gap-3 py-6 sm:grid-cols-[70px_1fr] sm:gap-5 sm:py-7">
                <span className="font-serif text-2xl italic text-[#84927f]">{step.number}</span>
                <div>
                  <h3 className="text-lg font-semibold tracking-[-0.025em] text-[#2a3d30]">{step.title}</h3>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-[#68746a]">{step.text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="controls" className="border-y border-[#e3e2d9] bg-white/65">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#71816f]">Useful controls, not more noise</p>
            <h2 className="mt-4 font-serif text-3xl leading-tight tracking-[-0.04em] text-[#24362a] sm:text-4xl">
              Built around the decisions finance teams actually make.
            </h2>
          </div>

          <div className="mt-11 grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-4">
            <article className="border-t border-[#dfe1d7] pt-5">
              <Building2 size={21} strokeWidth={1.7} className="text-[#54745b]" aria-hidden="true" />
              <h3 className="mt-4 text-base font-semibold text-[#2b3d31]">Vendor detail checks</h3>
              <p className="mt-2 text-sm leading-6 text-[#6b756c]">Compare submitted bank details with the vendor information already on file.</p>
            </article>
            <article className="border-t border-[#dfe1d7] pt-5">
              <CircleAlert size={21} strokeWidth={1.7} className="text-[#9d6c43]" aria-hidden="true" />
              <h3 className="mt-4 text-base font-semibold text-[#2b3d31]">Risk-based review</h3>
              <p className="mt-2 text-sm leading-6 text-[#6b756c]">Surface signals such as unfamiliar vendors, unusual amounts, and changed routing details.</p>
            </article>
            <article className="border-t border-[#dfe1d7] pt-5">
              <Fingerprint size={21} strokeWidth={1.7} className="text-[#54745b]" aria-hidden="true" />
              <h3 className="mt-4 text-base font-semibold text-[#2b3d31]">Passkey approvals</h3>
              <p className="mt-2 text-sm leading-6 text-[#6b756c]">Capture approval from an authorized controller or CFO using a registered authenticator.</p>
            </article>
            <article className="border-t border-[#dfe1d7] pt-5">
              <History size={21} strokeWidth={1.7} className="text-[#54745b]" aria-hidden="true" />
              <h3 className="mt-4 text-base font-semibold text-[#2b3d31]">Review-ready history</h3>
              <p className="mt-2 text-sm leading-6 text-[#6b756c]">Keep a searchable record of request changes, approvals, and investigation notes.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="bg-[#263d31] text-[#f6f5ef]">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-16 sm:px-8 md:grid-cols-[1fr_auto] md:items-center md:py-20">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#b9c9b8]">Designed to sit alongside your bank</p>
            <h2 className="mt-4 font-serif text-3xl leading-tight tracking-[-0.04em] sm:text-4xl">
              Keep your payment process. Make the decision clearer.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[#d0d9d0] sm:text-base sm:leading-7">
              ClearWire governs and records the internal request and approval. Your team remains in control of releasing the payment through its existing process.
            </p>
          </div>
          <Link href="/signup" className="inline-flex min-h-12 items-center justify-center gap-2 self-start rounded-lg bg-[#f5f4ee] px-5 py-3 text-sm font-semibold text-[#2c4935] transition-colors hover:bg-white md:self-center">
            Create workspace <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </section>

      <footer className="bg-[#f5f4ee]">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-8 sm:px-8 md:flex-row md:items-center md:justify-between">
          <Link href="/" className="flex items-center gap-2.5 text-sm font-semibold tracking-[-0.02em] text-[#31483a]">
            <ShieldCheck size={19} className="text-[#54745b]" aria-hidden="true" />
            ClearWire
          </Link>
          <p className="max-w-xl text-xs leading-5 text-[#7b847b]">
            Payment request review and approval controls for finance teams. ClearWire does not move funds or replace your bank.
          </p>
          <div className="flex items-center gap-5 text-sm">
            <Link href="/login" className="text-[#647067] transition-colors hover:text-[#203329]">Sign in</Link>
            <a href="mailto:davidlucasonorigho@gmail.com?subject=ClearWire%20enquiry" className="inline-flex items-center gap-1 font-medium text-[#315741] transition-colors hover:text-[#203329]">
              Contact <ArrowUpRight size={14} aria-hidden="true" />
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
