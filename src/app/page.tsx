import Link from "next/link";
import { Lock, FileText, AlertTriangle, Fingerprint, ChevronRight, Stamp, CheckCircle2 } from "lucide-react";
import { Space_Grotesk, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"] });
const ibmSans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"] });
const ibmMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"] });

export default function LandingPage() {
  return (
    <div className={`min-h-screen bg-graphite text-steel ${ibmSans.className} selection:bg-line/30 flex flex-col`}>
      {/* Navigation */}
      <nav className="border-b border-line/20 bg-graphite/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
            <Stamp className="text-wire" size={24} />
            <span className={`text-steel ${spaceGrotesk.className}`}>ClearWire</span>
          </div>
          <div className="flex items-center gap-4 sm:gap-6">
            <a href="mailto:davidlucasonorigho@gmail.com?subject=ClearWire%20Demo%20Request" className="hidden md:block text-sm font-medium text-slate hover:text-steel transition-colors">
              Contact Sales
            </a>
            <Link href="/signup" className="bg-panel hover:bg-wire hover:text-graphite border border-line/50 text-steel px-4 py-2 rounded-none text-sm font-semibold transition-all">
              Create Workspace
            </Link>
            <Link href="/login" className="text-sm font-semibold text-slate hover:text-steel transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-16 px-4 relative overflow-hidden flex-1">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-panel border border-line/30 text-wire text-xs font-semibold uppercase tracking-widest mb-6">
              <Lock size={14} /> Enterprise Payment Governance
            </div>
            
            <h1 className={`text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-[1.15] text-steel ${spaceGrotesk.className}`}>
              Prevent unauthorized wire transfers before money leaves your business.
            </h1>
            
            <p className="text-lg md:text-xl text-slate mb-10 leading-relaxed">
              ClearWire is a payment governance platform for finance teams. We detect high-risk beneficiary changes, enforce approval policies, and require cryptographic authorization before high-value payments are released.
            </p>
            
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <a href="mailto:davidlucasonorigho@gmail.com?subject=ClearWire%20Demo%20Request" className="w-full sm:w-auto bg-steel hover:bg-wire text-graphite px-8 py-4 rounded-none text-base font-bold transition-all flex items-center justify-center gap-2">
                Request a Live Demo <ChevronRight size={18} />
              </a>
            </div>

            <div className="flex flex-col gap-3 mt-12 text-sm text-slate font-medium">
              <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-wire"></span> Passkey-Protected Executive Approvals</span>
              <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-wire"></span> Vendor Risk Detection</span>
              <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-wire"></span> Immutable Audit Trail</span>
            </div>
          </div>

          {/* Signature Element: The Ledger Chain */}
          <div className="relative lg:pl-10">
            <div className="relative flex flex-col gap-6 font-medium">
              {/* The brass connecting line */}
              <div className="absolute left-6 top-6 bottom-6 w-px bg-line/40 z-0"></div>

              {/* Entry 1 */}
              <div className="relative z-10 flex items-start gap-4">
                <div className="w-12 h-12 rounded-none bg-panel border border-line flex items-center justify-center shrink-0">
                  <FileText size={20} className="text-wire"/>
                </div>
                <div className="bg-panel border border-line/30 p-5 w-full text-left">
                  <div className="flex flex-wrap justify-between items-start mb-2 gap-2">
                    <span className="text-steel font-semibold tracking-wide">Wire Created</span>
                    <span className={`text-slate text-xs ${ibmMono.className}`}>...e3b8a1c9</span>
                  </div>
                  <div className={`text-slate text-sm ${ibmMono.className}`}>VENDOR: Acme Corp <br/> AMOUNT: $245,000.00</div>
                </div>
              </div>

              {/* Entry 2 */}
              <div className="relative z-10 flex items-start gap-4">
                <div className="w-12 h-12 rounded-none bg-signal-red flex items-center justify-center shrink-0 shadow-md">
                  <AlertTriangle size={20} className="text-steel"/>
                </div>
                <div className="bg-signal-red/10 border-l-4 border-y border-r border-y-[#A63A2E]/30 border-r-[#A63A2E]/30 border-l-[#A63A2E] p-5 w-full text-left" style={{ clipPath: "polygon(0 0, 100% 0, 98% 10%, 100% 20%, 98% 30%, 100% 40%, 98% 50%, 100% 60%, 98% 70%, 100% 80%, 98% 90%, 100% 100%, 0 100%)" }}>
                  <div className="flex flex-wrap justify-between items-start mb-2 gap-2">
                    <span className="text-signal-red font-bold tracking-wide">Bank Details Changed — FROZEN</span>
                    <span className={`text-signal-red/70 text-xs ${ibmMono.className}`}>...a4f2e91b</span>
                  </div>
                  <div className="text-slate text-sm">Automated risk policy enforcement triggered. High-risk beneficiary change detected.</div>
                </div>
              </div>

              {/* Entry 3 */}
              <div className="relative z-10 flex items-start gap-4">
                <div className="w-12 h-12 rounded-none bg-panel border border-signal-green/50 flex items-center justify-center shrink-0">
                  <CheckCircle2 size={20} className="text-signal-green"/>
                </div>
                <div className="bg-panel border border-signal-green/30 p-5 w-full text-left">
                  <div className="flex flex-wrap justify-between items-start mb-2 gap-2">
                    <span className="text-signal-green font-semibold tracking-wide">Callback Verified</span>
                    <span className={`text-slate text-xs ${ibmMono.className}`}>...7c9f02d4</span>
                  </div>
                  <div className="text-slate text-sm">Confirmed by: J. Doe (Accounts Receivable). Out-of-band verification recorded.</div>
                </div>
              </div>

              {/* Entry 4 */}
              <div className="relative z-10 flex items-start gap-4">
                <div className="w-12 h-12 rounded-none bg-signal-green flex items-center justify-center shrink-0">
                  <Stamp size={20} className="text-steel"/>
                </div>
                <div className="bg-signal-green/10 border border-signal-green/50 p-5 w-full text-left relative overflow-hidden">
                  <div className="absolute -right-4 -bottom-4 text-signal-green/20 pointer-events-none">
                    <Stamp size={80} />
                  </div>
                  <div className="flex flex-wrap justify-between items-start mb-2 relative z-10 gap-2">
                    <span className="text-signal-green font-bold tracking-wide">Approved via Passkey</span>
                    <span className={`text-signal-green/70 text-xs ${ibmMono.className}`}>...9b56f1a3</span>
                  </div>
                  <div className="text-slate text-sm relative z-10">Cryptographic authorization completed.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Problem Section */}
      <section className="py-20 px-4 bg-panel border-y border-line/20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className={`text-3xl md:text-4xl font-bold text-steel mb-8 ${spaceGrotesk.className}`}>Every wire transfer demands verification.</h2>
          <p className="text-slate text-lg leading-relaxed mb-6">
            Payment fraud rarely requires stolen credentials. A single maliciously changed bank account routing number on a legitimate invoice is enough to redirect hundreds of thousands of dollars.
          </p>
          <p className="text-wire text-xl font-medium leading-relaxed">
            ClearWire mathematically verifies payment details, halts anomalous beneficiary changes, and demands cryptographic proof before funds are released.
          </p>
        </div>
      </section>

      {/* 3-Step Workflow Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className={`text-3xl md:text-4xl font-bold text-steel mb-6 ${spaceGrotesk.className}`}>How ClearWire Works</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="bg-panel p-8 border border-line/20 relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-line/30"></div>
              <div className={`text-wire font-bold text-sm uppercase tracking-widest mb-4 ${ibmMono.className}`}>01. Create</div>
              <h3 className="text-xl font-bold text-steel mb-3">Initiate Payment</h3>
              <p className="text-slate leading-relaxed text-sm">
                An Accounts Payable Clerk submits a payment request tied to a specific, tracked vendor profile within the workspace.
              </p>
            </div>
            
            {/* Step 2 */}
            <div className="bg-panel p-8 border border-line/20 relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-signal-red/80"></div>
              <div className={`text-signal-red font-bold text-sm uppercase tracking-widest mb-4 ${ibmMono.className}`}>02. Analyze</div>
              <h3 className="text-xl font-bold text-steel mb-3">Halt Anomalies</h3>
              <p className="text-slate leading-relaxed text-sm">
                The Risk Engine compares beneficiary details against trusted histories. If banking details have shifted or velocity spikes, the transaction freezes automatically.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-panel p-8 border border-line/20 relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-signal-green/80"></div>
              <div className={`text-signal-green font-bold text-sm uppercase tracking-widest mb-4 ${ibmMono.className}`}>03. Approve</div>
              <h3 className="text-xl font-bold text-steel mb-3">Cryptographic Seal</h3>
              <p className="text-slate leading-relaxed text-sm">
                Authorized executives review exceptions and sign off using secure WebAuthn hardware passkeys, creating an unforgeable ledger entry.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Section */}
      <section className="py-20 px-4 bg-panel border-y border-line/20">
        <div className="max-w-6xl mx-auto">
          <div className="mb-16 md:flex md:items-end md:justify-between border-b border-line/30 pb-6">
            <h2 className={`text-3xl font-bold text-steel ${spaceGrotesk.className}`}>Built for strict financial compliance.</h2>
          </div>

          <div className="flex flex-col">
            <div className="py-6 border-b border-line/10 grid md:grid-cols-4 gap-4 items-start">
              <div className={`text-wire text-xs font-bold uppercase tracking-widest md:col-span-1 ${ibmMono.className}`}>
                Risk Intelligence
              </div>
              <div className="md:col-span-3">
                <h3 className="text-lg font-bold text-steel mb-2">Vendor Anomaly Detection</h3>
                <p className="text-slate font-light leading-relaxed">
                  Automatically flags and freezes payments encountering unexpected beneficiary account changes before execution.
                </p>
              </div>
            </div>
            
            <div className="py-6 border-b border-line/10 grid md:grid-cols-4 gap-4 items-start">
              <div className={`text-wire text-xs font-bold uppercase tracking-widest md:col-span-1 ${ibmMono.className}`}>
                Executive Controls
              </div>
              <div className="md:col-span-3">
                <h3 className="text-lg font-bold text-steel mb-2">Multi-Signature Routing</h3>
                <p className="text-slate font-light leading-relaxed">
                  Require secure, multi-party cryptographic approval for high-value or elevated-risk payments based on dynamic company thresholds.
                </p>
              </div>
            </div>

            <div className="py-6 border-b border-line/10 grid md:grid-cols-4 gap-4 items-start">
              <div className={`text-wire text-xs font-bold uppercase tracking-widest md:col-span-1 ${ibmMono.className}`}>
                Auditability
              </div>
              <div className="md:col-span-3">
                <h3 className="text-lg font-bold text-steel mb-2">Immutable WORM Trail</h3>
                <p className="text-slate font-light leading-relaxed">
                  Maintain a complete, SHA-256 chained history of every payment decision, enabling forensic reconstruction for compliance officers.
                </p>
              </div>
            </div>

            <div className="py-6 grid md:grid-cols-4 gap-4 items-start">
              <div className={`text-wire text-xs font-bold uppercase tracking-widest md:col-span-1 ${ibmMono.className}`}>
                Architecture
              </div>
              <div className="md:col-span-3">
                <h3 className="text-lg font-bold text-steel mb-2">Separation of Duties</h3>
                <p className="text-slate font-light leading-relaxed">
                  Strictly enforced at the database level to mathematically prevent the same individual from both initiating and authorizing a transaction.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 relative overflow-hidden">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className={`text-4xl md:text-5xl font-bold mb-6 text-steel tracking-tight ${spaceGrotesk.className}`}>Secure your payment lifecycle.</h2>
          <p className="text-slate text-xl mb-10 max-w-2xl mx-auto font-light leading-relaxed">
            See how ClearWire halts payment anomalies, enforces multi-party governance, and establishes a cryptographic chain of custody.
          </p>
          <a href="mailto:davidlucasonorigho@gmail.com?subject=ClearWire%20Enterprise%20Demo%20Request" className="inline-flex bg-steel text-graphite hover:bg-wire px-8 py-4 rounded-none text-base font-bold transition-colors items-center gap-3">
            Schedule a Live Demo <ChevronRight size={18} />
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-graphite py-12 px-6 text-center border-t border-line/20">
        <div className="max-w-6xl mx-auto flex flex-col items-center justify-center gap-4">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-steel mb-2">
            <Stamp className="text-wire" size={20} />
            <span className={spaceGrotesk.className}>ClearWire</span>
          </div>
          <p className="text-slate text-sm">
            Enterprise Payment Governance.
          </p>
          <a href="mailto:davidlucasonorigho@gmail.com" className="text-wire text-sm hover:text-steel transition-colors mt-4">
            davidlucasonorigho@gmail.com
          </a>
        </div>
      </footer>
    </div>
  );
}
