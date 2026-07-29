import Link from "next/link";
import { ShieldCheck, Lock, FileText, AlertTriangle, Fingerprint, ChevronRight, CheckCircle2, ShieldAlert } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-50 font-sans selection:bg-blue-500/30">
      {/* Navigation */}
      <nav className="border-b border-white/5 bg-[#020617]/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
            <ShieldCheck className="text-blue-500" size={28} />
            <span className="text-white">ClearWire</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="mailto:davidlucasonorigho@gmail.com?subject=ClearWire%20Demo%20Request" className="hidden md:block text-sm font-medium text-slate-400 hover:text-white transition-colors">
              Contact Sales
            </a>
            <Link href="/signup" className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-bold transition-all shadow-md mr-3">Create Workspace</Link>
            <Link href="/login" className="bg-white/10 hover:bg-white/20 border border-white/10 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm">
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-24 px-4 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-5xl h-[600px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none"></div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold uppercase tracking-widest mb-8">
            <Lock size={14} /> Enterprise Payment Governance
          </div>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-8 leading-[1.15]">
            Prevent Unauthorized & High-Risk Wire Transfers <br/>
            <span className="text-blue-400">Before Money Leaves Your Business.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-400 mb-12 max-w-3xl mx-auto leading-relaxed font-light">
            ClearWire is a payment governance platform for finance teams. We detect high-risk beneficiary changes, enforce approval policies, and require cryptographic authorization before high-value payments are released.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="mailto:davidlucasonorigho@gmail.com?subject=ClearWire%20Demo%20Request" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl text-lg font-bold transition-all shadow-lg flex items-center justify-center gap-2">
              Request a Live Demo <ChevronRight size={20} />
            </a>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10 mt-16 text-sm text-slate-400 font-medium">
            <span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-blue-500"/> Passkey-Protected Executive Approvals</span>
            <span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-blue-500"/> Vendor Risk Detection</span>
            <span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-blue-500"/> Immutable Audit Trail</span>
          </div>
        </div>
      </section>

      {/* The Problem Section */}
      <section className="py-24 px-4 bg-[#0f172a] border-y border-white/5">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-8">Every Wire Transfer Deserves Verification.</h2>
          <p className="text-slate-400 text-lg leading-relaxed mb-6">
            Payment fraud doesn't always start with stolen credentials. Sometimes it's a single changed bank account, an edited invoice, or a fraudulent payment request that looks legitimate.
          </p>
          <p className="text-slate-300 text-xl font-medium leading-relaxed">
            ClearWire verifies payment details, detects unusual beneficiary changes, and ensures the right people approve the right payments before funds leave your organization.
          </p>
        </div>
      </section>

      {/* Workflow Section (CSS Mockups) */}
      <section className="py-32 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-bold text-white mb-6">How ClearWire Works</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-12 relative">
            {/* Connecting Lines (Hidden on mobile) */}
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-gradient-to-r from-blue-900 via-slate-700 to-emerald-900 -z-10"></div>

            {/* Step 1 */}
            <div className="bg-[#0f172a] p-8 rounded-3xl border border-white/5 relative z-10">
              <div className="w-12 h-12 bg-slate-800 text-slate-300 rounded-full flex items-center justify-center font-bold text-xl mb-6 border border-slate-700">1</div>
              <h3 className="text-xl font-bold text-white mb-3">Create Payment</h3>
              <p className="text-slate-400 leading-relaxed mb-8 font-light text-sm">
                An Accounts Payable Clerk creates a payment request using a verified vendor.
              </p>
              <div className="bg-[#1e293b] p-4 rounded-xl border border-slate-700 space-y-3">
                <div className="h-2 w-1/3 bg-slate-600 rounded"></div>
                <div className="h-8 w-full bg-slate-800 rounded border border-slate-600 flex items-center px-3 text-xs text-slate-400">Select Vendor...</div>
                <div className="h-8 w-full bg-slate-800 rounded border border-slate-600 flex items-center px-3 text-xs text-slate-400">Amount USD</div>
                <div className="h-8 w-1/2 bg-blue-600 rounded ml-auto mt-2"></div>
              </div>
            </div>
            
            {/* Step 2 */}
            <div className="bg-[#0f172a] p-8 rounded-3xl border border-red-500/20 relative z-10 shadow-[0_0_30px_-10px_rgba(239,68,68,0.2)]">
              <div className="w-12 h-12 bg-red-900/50 text-red-400 rounded-full flex items-center justify-center font-bold text-xl mb-6 border border-red-500/30">2</div>
              <h3 className="text-xl font-bold text-white mb-3">Analyze Risk</h3>
              <p className="text-slate-400 leading-relaxed mb-8 font-light text-sm">
                ClearWire compares beneficiary details against trusted vendor records and company approval policies. If suspicious changes are detected, the payment is automatically held.
              </p>
              <div className="bg-red-950/30 p-4 rounded-xl border border-red-900/50 flex items-start gap-3">
                <ShieldAlert className="text-red-500 shrink-0" size={24} />
                <div>
                  <div className="text-sm font-bold text-red-400 mb-1">Payment Frozen</div>
                  <div className="text-xs text-red-300/70">Risk Engine detected unexpected beneficiary account changes. Escalated for review.</div>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-[#0f172a] p-8 rounded-3xl border border-emerald-500/20 relative z-10 shadow-[0_0_30px_-10px_rgba(16,185,129,0.1)]">
              <div className="w-12 h-12 bg-emerald-900/50 text-emerald-400 rounded-full flex items-center justify-center font-bold text-xl mb-6 border border-emerald-500/30">3</div>
              <h3 className="text-xl font-bold text-white mb-3">Executive Approval</h3>
              <p className="text-slate-400 leading-relaxed mb-8 font-light text-sm">
                Authorized approvers review the payment and approve it securely using hardware-backed passkeys. Every decision is permanently recorded in the audit trail.
              </p>
              <div className="bg-[#1e293b] p-4 rounded-xl border border-emerald-900/50 text-center space-y-4">
                <Fingerprint className="text-emerald-500 mx-auto" size={32} />
                <div className="h-10 w-full bg-blue-600 rounded-lg flex items-center justify-center text-xs font-bold text-white">
                  Sign with Passkey
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="py-24 px-4 bg-[#0f172a] border-y border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">Built for Financial Control</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="p-8 rounded-2xl border border-white/5 bg-[#020617]/50">
              <AlertTriangle className="text-blue-400 mb-4" size={28} />
              <h3 className="text-xl font-bold text-white mb-3">Vendor Risk Intelligence</h3>
              <p className="text-slate-400 leading-relaxed font-light">
                Detect unexpected beneficiary account changes before payment execution.
              </p>
            </div>
            
            <div className="p-8 rounded-2xl border border-white/5 bg-[#020617]/50">
              <Lock className="text-blue-400 mb-4" size={28} />
              <h3 className="text-xl font-bold text-white mb-3">Executive Approval Controls</h3>
              <p className="text-slate-400 leading-relaxed font-light">
                Require secure, multi-party approval for high-value or high-risk payments.
              </p>
            </div>

            <div className="p-8 rounded-2xl border border-white/5 bg-[#020617]/50">
              <FileText className="text-blue-400 mb-4" size={28} />
              <h3 className="text-xl font-bold text-white mb-3">Immutable Audit Trail</h3>
              <p className="text-slate-400 leading-relaxed font-light">
                Maintain a complete, cryptographically verified history of every payment decision for compliance and investigations.
              </p>
            </div>

            <div className="p-8 rounded-2xl border border-white/5 bg-[#020617]/50">
              <ShieldCheck className="text-blue-400 mb-4" size={28} />
              <h3 className="text-xl font-bold text-white mb-3">Separation of Duties</h3>
              <p className="text-slate-400 leading-relaxed font-light">
                Enforced at the database level to mathematically prevent the same individual from creating and approving a payment.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-4 relative overflow-hidden">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold mb-8 text-white tracking-tight">See ClearWire in Action.</h2>
          <p className="text-slate-400 text-xl mb-12 max-w-2xl mx-auto font-light leading-relaxed">
            Watch how a suspicious beneficiary change is detected, frozen automatically, reviewed by finance leadership, and securely approved—all in under five minutes.
          </p>
          <a href="mailto:davidlucasonorigho@gmail.com?subject=ClearWire%20Enterprise%20Demo%20Request" className="inline-flex bg-blue-600 text-white hover:bg-blue-500 px-10 py-5 rounded-xl text-lg font-bold transition-all shadow-lg hover:scale-105 items-center gap-3">
            Schedule a Live Demo <ChevronRight size={20} />
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#020617] py-12 px-6 text-center border-t border-white/5">
        <div className="max-w-6xl mx-auto flex flex-col items-center justify-center gap-4">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-white mb-2">
            <ShieldCheck className="text-blue-500" size={24} />
            <span>ClearWire</span>
          </div>
          <p className="text-slate-500 text-sm font-medium">
            Enterprise Payment Governance for Modern Finance Teams.
          </p>
          <a href="mailto:davidlucasonorigho@gmail.com" className="text-slate-600 text-sm hover:text-white transition-colors mt-4">
            davidlucasonorigho@gmail.com
          </a>
        </div>
      </footer>
    </div>
  );
}
