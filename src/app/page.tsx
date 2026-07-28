import Link from "next/link";
import { Lock, FileText, AlertTriangle, Fingerprint, ChevronRight, Stamp, CheckCircle2 } from "lucide-react";
import { Fraunces, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";

const fraunces = Fraunces({ subsets: ["latin"], weight: ["600", "700"] });
const ibmSans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"] });
const ibmMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"] });

export default function LandingPage() {
  return (
    <div className={`min-h-screen bg-[#1B1A17] text-[#EDE8DE] ${ibmSans.className} selection:bg-[#B08D57]/30 flex flex-col`}>
      {/* Navigation */}
      <nav className="border-b border-[#B08D57]/20 bg-[#1B1A17]/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
            <Stamp className="text-[#B08D57]" size={24} />
            <span className={`text-[#EDE8DE] ${fraunces.className}`}>ClearWire</span>
          </div>
          <div className="flex items-center gap-4 sm:gap-6">
            <a href="mailto:davidlucasonorigho@gmail.com?subject=ClearWire%20Demo%20Request" className="hidden md:block text-sm font-medium text-[#A8A296] hover:text-[#EDE8DE] transition-colors">
              Contact Sales
            </a>
            <Link href="/signup" className="bg-[#23221E] hover:bg-[#B08D57] hover:text-[#1B1A17] border border-[#B08D57]/50 text-[#EDE8DE] px-4 py-2 rounded-none text-sm font-semibold transition-all">
              Create Workspace
            </Link>
            <Link href="/login" className="text-sm font-semibold text-[#A8A296] hover:text-[#EDE8DE] transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-16 px-4 relative overflow-hidden flex-1">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#23221E] border border-[#B08D57]/30 text-[#B08D57] text-xs font-semibold uppercase tracking-widest mb-6">
              <Lock size={14} /> Enterprise Payment Governance
            </div>
            
            <h1 className={`text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-[1.15] text-[#EDE8DE] ${fraunces.className}`}>
              Prevent unauthorized wire transfers before money leaves your business.
            </h1>
            
            <p className="text-lg md:text-xl text-[#A8A296] mb-10 leading-relaxed">
              ClearWire is a payment governance platform for finance teams. We detect high-risk beneficiary changes, enforce approval policies, and require cryptographic authorization before high-value payments are released.
            </p>
            
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <a href="mailto:davidlucasonorigho@gmail.com?subject=ClearWire%20Demo%20Request" className="w-full sm:w-auto bg-[#EDE8DE] hover:bg-[#B08D57] text-[#1B1A17] px-8 py-4 rounded-none text-base font-bold transition-all flex items-center justify-center gap-2">
                Request a Live Demo <ChevronRight size={18} />
              </a>
            </div>

            <div className="flex flex-col gap-3 mt-12 text-sm text-[#A8A296] font-medium">
              <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-[#B08D57]"></span> Passkey-Protected Executive Approvals</span>
              <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-[#B08D57]"></span> Vendor Risk Detection</span>
              <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-[#B08D57]"></span> Immutable Audit Trail</span>
            </div>
          </div>

          {/* Signature Element: The Ledger Chain */}
          <div className="relative lg:pl-10">
            <div className="relative flex flex-col gap-6 font-medium">
              {/* The brass connecting line */}
              <div className="absolute left-6 top-6 bottom-6 w-px bg-[#B08D57]/40 z-0"></div>

              {/* Entry 1 */}
              <div className="relative z-10 flex items-start gap-4">
                <div className="w-12 h-12 rounded-none bg-[#23221E] border border-[#B08D57] flex items-center justify-center shrink-0">
                  <FileText size={20} className="text-[#B08D57]"/>
                </div>
                <div className="bg-[#23221E] border border-[#B08D57]/30 p-5 w-full text-left">
                  <div className="flex flex-wrap justify-between items-start mb-2 gap-2">
                    <span className="text-[#EDE8DE] font-semibold tracking-wide">Wire Created</span>
                    <span className={`text-[#A8A296] text-xs ${ibmMono.className}`}>...e3b8a1c9</span>
                  </div>
                  <div className={`text-[#A8A296] text-sm ${ibmMono.className}`}>VENDOR: Acme Corp <br/> AMOUNT: $245,000.00</div>
                </div>
              </div>

              {/* Entry 2 */}
              <div className="relative z-10 flex items-start gap-4">
                <div className="w-12 h-12 rounded-none bg-[#A63A2E] flex items-center justify-center shrink-0 shadow-md">
                  <AlertTriangle size={20} className="text-[#EDE8DE]"/>
                </div>
                <div className="bg-[#A63A2E]/10 border-l-4 border-y border-r border-y-[#A63A2E]/30 border-r-[#A63A2E]/30 border-l-[#A63A2E] p-5 w-full text-left" style={{ clipPath: "polygon(0 0, 100% 0, 98% 10%, 100% 20%, 98% 30%, 100% 40%, 98% 50%, 100% 60%, 98% 70%, 100% 80%, 98% 90%, 100% 100%, 0 100%)" }}>
                  <div className="flex flex-wrap justify-between items-start mb-2 gap-2">
                    <span className="text-[#A63A2E] font-bold tracking-wide">Bank Details Changed — FROZEN</span>
                    <span className={`text-[#A63A2E]/70 text-xs ${ibmMono.className}`}>...a4f2e91b</span>
                  </div>
                  <div className="text-[#A8A296] text-sm">Automated risk policy enforcement triggered. High-risk beneficiary change detected.</div>
                </div>
              </div>

              {/* Entry 3 */}
              <div className="relative z-10 flex items-start gap-4">
                <div className="w-12 h-12 rounded-none bg-[#23221E] border border-[#4E7A64]/50 flex items-center justify-center shrink-0">
                  <CheckCircle2 size={20} className="text-[#4E7A64]"/>
                </div>
                <div className="bg-[#23221E] border border-[#4E7A64]/30 p-5 w-full text-left">
                  <div className="flex flex-wrap justify-between items-start mb-2 gap-2">
                    <span className="text-[#4E7A64] font-semibold tracking-wide">Callback Verified</span>
                    <span className={`text-[#A8A296] text-xs ${ibmMono.className}`}>...7c9f02d4</span>
                  </div>
                  <div className="text-[#A8A296] text-sm">Confirmed by: J. Doe (Accounts Receivable). Out-of-band verification recorded.</div>
                </div>
              </div>

              {/* Entry 4 */}
              <div className="relative z-10 flex items-start gap-4">
                <div className="w-12 h-12 rounded-none bg-[#4E7A64] flex items-center justify-center shrink-0">
                  <Stamp size={20} className="text-[#EDE8DE]"/>
                </div>
                <div className="bg-[#4E7A64]/10 border border-[#4E7A64]/50 p-5 w-full text-left relative overflow-hidden">
                  <div className="absolute -right-4 -bottom-4 text-[#4E7A64]/20 pointer-events-none">
                    <Stamp size={80} />
                  </div>
                  <div className="flex flex-wrap justify-between items-start mb-2 relative z-10 gap-2">
                    <span className="text-[#4E7A64] font-bold tracking-wide">Approved via Passkey</span>
                    <span className={`text-[#4E7A64]/70 text-xs ${ibmMono.className}`}>...9b56f1a3</span>
                  </div>
                  <div className="text-[#A8A296] text-sm relative z-10">Cryptographic authorization completed.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Problem Section */}
      <section className="py-24 px-4 bg-[#23221E] border-y border-[#B08D57]/20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className={`text-3xl md:text-4xl font-bold text-[#EDE8DE] mb-8 ${fraunces.className}`}>Every wire transfer demands verification.</h2>
          <p className="text-[#A8A296] text-lg leading-relaxed mb-6">
            Payment fraud rarely requires stolen credentials. A single maliciously changed bank account routing number on a legitimate invoice is enough to redirect hundreds of thousands of dollars.
          </p>
          <p className="text-[#B08D57] text-xl font-medium leading-relaxed">
            ClearWire mathematically verifies payment details, halts anomalous beneficiary changes, and demands cryptographic proof before funds are released.
          </p>
        </div>
      </section>

      {/* 3-Step Workflow Section */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className={`text-3xl md:text-4xl font-bold text-[#EDE8DE] mb-6 ${fraunces.className}`}>How ClearWire Works</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="bg-[#23221E] p-8 border border-[#B08D57]/20 relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-[#B08D57]/30"></div>
              <div className={`text-[#B08D57] font-bold text-sm uppercase tracking-widest mb-4 ${ibmMono.className}`}>01. Create</div>
              <h3 className="text-xl font-bold text-[#EDE8DE] mb-3">Initiate Payment</h3>
              <p className="text-[#A8A296] leading-relaxed text-sm">
                An Accounts Payable Clerk submits a payment request tied to a specific, tracked vendor profile within the workspace.
              </p>
            </div>
            
            {/* Step 2 */}
            <div className="bg-[#23221E] p-8 border border-[#B08D57]/20 relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-[#A63A2E]/80"></div>
              <div className={`text-[#A63A2E] font-bold text-sm uppercase tracking-widest mb-4 ${ibmMono.className}`}>02. Analyze</div>
              <h3 className="text-xl font-bold text-[#EDE8DE] mb-3">Halt Anomalies</h3>
              <p className="text-[#A8A296] leading-relaxed text-sm">
                The Risk Engine compares beneficiary details against trusted histories. If banking details have shifted or velocity spikes, the transaction freezes automatically.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-[#23221E] p-8 border border-[#B08D57]/20 relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-[#4E7A64]/80"></div>
              <div className={`text-[#4E7A64] font-bold text-sm uppercase tracking-widest mb-4 ${ibmMono.className}`}>03. Approve</div>
              <h3 className="text-xl font-bold text-[#EDE8DE] mb-3">Cryptographic Seal</h3>
              <p className="text-[#A8A296] leading-relaxed text-sm">
                Authorized executives review exceptions and sign off using secure WebAuthn hardware passkeys, creating an unforgeable ledger entry.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Section */}
      <section className="py-24 px-4 bg-[#23221E] border-y border-[#B08D57]/20">
        <div className="max-w-6xl mx-auto">
          <div className="mb-16 md:flex md:items-end md:justify-between border-b border-[#B08D57]/30 pb-6">
            <h2 className={`text-3xl font-bold text-[#EDE8DE] ${fraunces.className}`}>Built for strict financial compliance.</h2>
          </div>

          <div className="flex flex-col">
            <div className="py-6 border-b border-[#B08D57]/10 grid md:grid-cols-4 gap-4 items-start">
              <div className={`text-[#B08D57] text-xs font-bold uppercase tracking-widest md:col-span-1 ${ibmMono.className}`}>
                Risk Intelligence
              </div>
              <div className="md:col-span-3">
                <h3 className="text-lg font-bold text-[#EDE8DE] mb-2">Vendor Anomaly Detection</h3>
                <p className="text-[#A8A296] font-light leading-relaxed">
                  Automatically flags and freezes payments encountering unexpected beneficiary account changes before execution.
                </p>
              </div>
            </div>
            
            <div className="py-6 border-b border-[#B08D57]/10 grid md:grid-cols-4 gap-4 items-start">
              <div className={`text-[#B08D57] text-xs font-bold uppercase tracking-widest md:col-span-1 ${ibmMono.className}`}>
                Executive Controls
              </div>
              <div className="md:col-span-3">
                <h3 className="text-lg font-bold text-[#EDE8DE] mb-2">Multi-Signature Routing</h3>
                <p className="text-[#A8A296] font-light leading-relaxed">
                  Require secure, multi-party cryptographic approval for high-value or elevated-risk payments based on dynamic company thresholds.
                </p>
              </div>
            </div>

            <div className="py-6 border-b border-[#B08D57]/10 grid md:grid-cols-4 gap-4 items-start">
              <div className={`text-[#B08D57] text-xs font-bold uppercase tracking-widest md:col-span-1 ${ibmMono.className}`}>
                Auditability
              </div>
              <div className="md:col-span-3">
                <h3 className="text-lg font-bold text-[#EDE8DE] mb-2">Immutable WORM Trail</h3>
                <p className="text-[#A8A296] font-light leading-relaxed">
                  Maintain a complete, SHA-256 chained history of every payment decision, enabling forensic reconstruction for compliance officers.
                </p>
              </div>
            </div>

            <div className="py-6 grid md:grid-cols-4 gap-4 items-start">
              <div className={`text-[#B08D57] text-xs font-bold uppercase tracking-widest md:col-span-1 ${ibmMono.className}`}>
                Architecture
              </div>
              <div className="md:col-span-3">
                <h3 className="text-lg font-bold text-[#EDE8DE] mb-2">Separation of Duties</h3>
                <p className="text-[#A8A296] font-light leading-relaxed">
                  Strictly enforced at the database level to mathematically prevent the same individual from both initiating and authorizing a transaction.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-4 relative overflow-hidden">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className={`text-4xl md:text-5xl font-bold mb-6 text-[#EDE8DE] tracking-tight ${fraunces.className}`}>Secure your payment lifecycle.</h2>
          <p className="text-[#A8A296] text-xl mb-10 max-w-2xl mx-auto font-light leading-relaxed">
            See how ClearWire halts payment anomalies, enforces multi-party governance, and establishes a cryptographic chain of custody.
          </p>
          <a href="mailto:davidlucasonorigho@gmail.com?subject=ClearWire%20Enterprise%20Demo%20Request" className="inline-flex bg-[#EDE8DE] text-[#1B1A17] hover:bg-[#B08D57] px-8 py-4 rounded-none text-base font-bold transition-colors items-center gap-3">
            Schedule a Live Demo <ChevronRight size={18} />
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1B1A17] py-12 px-6 text-center border-t border-[#B08D57]/20">
        <div className="max-w-6xl mx-auto flex flex-col items-center justify-center gap-4">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-[#EDE8DE] mb-2">
            <Stamp className="text-[#B08D57]" size={20} />
            <span className={fraunces.className}>ClearWire</span>
          </div>
          <p className="text-[#A8A296] text-sm">
            Enterprise Payment Governance.
          </p>
          <a href="mailto:davidlucasonorigho@gmail.com" className="text-[#B08D57] text-sm hover:text-[#EDE8DE] transition-colors mt-4">
            davidlucasonorigho@gmail.com
          </a>
        </div>
      </footer>
    </div>
  );
}
