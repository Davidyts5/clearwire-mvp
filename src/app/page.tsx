import Link from "next/link";
import { ShieldCheck, Lock, FileText, AlertTriangle, Fingerprint, ChevronRight, Activity, ArrowRight, Shield } from "lucide-react";

export default function LandingPage() {
  const demoEmail = "davidlucasonorigho@gmail.com";
  const mailtoLink = `mailto:${demoEmail}?subject=ClearWire%20Enterprise%20Demo%20Request&body=Hi%20David,%0A%0AI%20would%20like%20to%20see%20a%20demo%20of%20ClearWire's%20fraud%20prevention%20platform.%0A%0ACompany:%0ARole:`;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-50 font-sans selection:bg-blue-500/30">
      {/* Navigation */}
      <nav className="border-b border-slate-800/60 bg-[#020617]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
            <ShieldCheck className="text-blue-500" size={28} />
            <span className="text-white">ClearWire</span>
          </div>
          <Link href="/login" className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-all">
            Sign In to Portal
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-24 pb-32 px-4 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl h-[400px] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none"></div>
        
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Lock size={14} /> Enterprise Payment Security Infrastructure
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-[1.1]">
            Immunize your AP department against <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">Deepfake Wire Fraud.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-3xl mx-auto leading-relaxed">
            ClearWire is a Zero-Trust routing engine that detects malicious bank account changes, enforces dynamic approval matrices, and secures millions in B2B payments using hardware cryptography.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href={mailtoLink} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl text-lg font-bold transition-all shadow-[0_0_40px_-10px_rgba(37,99,235,0.5)] flex items-center justify-center gap-2 hover:scale-105">
              Request a Demo <ChevronRight size={20} />
            </a>
            <a href="#how-it-works" className="w-full sm:w-auto bg-transparent hover:bg-slate-800 text-slate-300 border border-slate-700 px-8 py-4 rounded-xl text-lg font-bold transition-all flex items-center justify-center">
              See How It Works
            </a>
          </div>
        </div>
      </section>

      {/* How it Works / Workflow Section */}
      <section id="how-it-works" className="py-24 px-4 bg-slate-900 border-y border-slate-800">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">The Bank Changes Everything.</h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-lg">
              99% of wire fraud happens when a hacker intercepts an invoice and changes the routing details. ClearWire mathematically prevents this.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className="bg-slate-800/50 p-8 rounded-2xl border border-slate-700/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 text-8xl font-black text-slate-800/30 -z-10 select-none">1</div>
              <Activity className="text-blue-500 mb-6" size={40} />
              <h3 className="text-xl font-bold text-white mb-3">100-Point Risk Engine</h3>
              <p className="text-slate-400 leading-relaxed text-sm">
                When an AP Clerk drafts a wire, the system instantly cross-references the Vendor's IBAN/Account against historical master data. If an anomaly is detected, the transaction is violently frozen.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-slate-800/50 p-8 rounded-2xl border border-slate-700/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 text-8xl font-black text-slate-800/30 -z-10 select-none">2</div>
              <Shield className="text-emerald-500 mb-6" size={40} />
              <h3 className="text-xl font-bold text-white mb-3">Segregation of Duties</h3>
              <p className="text-slate-400 leading-relaxed text-sm">
                Strict multi-tenant Role-Based Access Control (RBAC). Controllers can approve wires up to their dynamic dollar-limits. Extreme risk events require explicit CFO unfreeze delegation.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-slate-800/50 p-8 rounded-2xl border border-slate-700/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 text-8xl font-black text-slate-800/30 -z-10 select-none">3</div>
              <Fingerprint className="text-purple-500 mb-6" size={40} />
              <h3 className="text-xl font-bold text-white mb-3">FIDO2 Hardware Passkeys</h3>
              <p className="text-slate-400 leading-relaxed text-sm">
                CFOs approve transactions using their phone's native Secure Enclave (FaceID / TouchID). The system mathematically binds the device signature, making remote deepfake attacks impossible.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Deep Dive */}
      <section className="py-24 px-4 bg-[#020617]">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-16">
          <div className="lg:w-1/2 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-widest">
              <FileText size={14} /> SOC-2 Compliant
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white">Immutable WORM Audit Logs</h2>
            <p className="text-slate-400 text-lg leading-relaxed">
              Every state transition—from draft to final approval—generates a cryptographic hash locked into an append-only PostgreSQL database. 
            </p>
            <ul className="space-y-4 mt-8">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="text-emerald-500 shrink-0 mt-1" size={20} />
                <span className="text-slate-300">Complete Chain of Custody tracking for insurance providers.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="text-emerald-500 shrink-0 mt-1" size={20} />
                <span className="text-slate-300">Database triggers actively block UPDATE or DELETE alterations by rogue admins.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="text-emerald-500 shrink-0 mt-1" size={20} />
                <span className="text-slate-300">Dynamic PDF Certificate generation embedding the source invoice documents.</span>
              </li>
            </ul>
          </div>
          
          <div className="lg:w-1/2 w-full">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
              <div className="border-b border-slate-800 pb-4 mb-4 flex justify-between items-center">
                <div className="text-slate-300 font-mono text-sm">AUDIT_LOG_STREAM</div>
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                </div>
              </div>
              <div className="space-y-4 font-mono text-xs text-slate-400">
                <div className="p-3 bg-slate-950 rounded border border-slate-800">
                  <span className="text-blue-400">[CREATED]</span> Wire ID: 9f86d... amount: $150,000
                </div>
                <div className="p-3 bg-slate-950 rounded border border-slate-800">
                  <span className="text-amber-400">[FROZEN]</span> Risk Score 100: Vendor IBAN Changed
                </div>
                <div className="p-3 bg-slate-950 rounded border border-slate-800">
                  <span className="text-emerald-400">[APPROVED]</span> FIDO2 Signature: 0x7b5...
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 bg-blue-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Ready to secure your treasury?</h2>
          <p className="text-blue-200 text-lg mb-10 max-w-2xl mx-auto">
            Book a 10-minute technical demonstration to see how ClearWire mathematically immunizes your AP department against Business Email Compromise.
          </p>
          <a href={mailtoLink} className="inline-flex items-center gap-2 bg-white text-blue-900 hover:bg-blue-50 px-8 py-4 rounded-xl text-lg font-bold transition-all shadow-xl hover:scale-105">
            Contact Founder <ArrowRight size={20} />
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#020617] py-12 text-center border-t border-slate-800/60">
        <div className="flex items-center justify-center gap-2 font-bold text-xl tracking-tight text-white mb-4">
          <ShieldCheck className="text-blue-500" size={24} />
          <span>ClearWire</span>
        </div>
        <p className="text-slate-500 text-sm mb-4">
          Built for modern finance teams.
        </p>
        <p className="text-slate-600 text-xs">
          © {new Date().getFullYear()} ClearWire Security. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
