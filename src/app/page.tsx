import Link from "next/link";
import { ShieldCheck, Lock, FileText, AlertTriangle, Fingerprint, ChevronRight, Activity, Zap, CheckCircle2 } from "lucide-react";

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
            <a href="mailto:davidlucasonorigho@gmail.com?subject=ClearWire%20Enterprise%20Demo%20Request" className="hidden md:block text-sm font-medium text-slate-400 hover:text-white transition-colors">
              Contact Sales
            </a>
            <Link href="/login" className="bg-white/10 hover:bg-white/20 border border-white/10 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm">
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-40 px-4 relative overflow-hidden">
        {/* Abstract Background Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-5xl h-[600px] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none"></div>
        
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Lock size={14} /> Enterprise Payment Security Infrastructure
          </div>
          
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight mb-8 leading-[1.1] animate-in fade-in slide-in-from-bottom-6 duration-700 delay-150">
            Stop Deepfake Wire Fraud <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400">Before It Happens.</span>
          </h1>
          
          <p className="text-lg md:text-2xl text-slate-400 mb-12 max-w-3xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300 font-light">
            ClearWire is a zero-trust authorization engine. We help finance teams detect risky vendor payment changes and enforce cryptographic multi-signature approvals before money leaves the company.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-500">
            <a href="mailto:davidlucasonorigho@gmail.com?subject=ClearWire%20Enterprise%20Demo%20Request" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl text-lg font-bold transition-all shadow-[0_0_40px_-10px_rgba(37,99,235,0.5)] flex items-center justify-center gap-2 hover:scale-105 border border-blue-500/50">
              Request a Live Demo <ChevronRight size={20} />
            </a>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-8 mt-12 text-sm text-slate-500 font-medium animate-in fade-in duration-1000 delay-700">
            <span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500"/> SOC 2 Ready</span>
            <span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500"/> FIDO2 Compliant</span>
            <span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500"/> WORM Audit Logs</span>
            <span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-500"/> Bank Agnostic</span>
          </div>
        </div>
      </section>

      {/* The $25M Problem Section */}
      <section className="py-32 px-4 bg-[#0f172a] border-y border-white/5 relative">
        <div className="absolute left-0 inset-y-0 w-1/2 bg-gradient-to-r from-blue-900/10 to-transparent pointer-events-none"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div>
              <div className="inline-flex items-center gap-2 text-red-400 font-bold tracking-widest text-xs uppercase mb-6 bg-red-400/10 px-3 py-1 rounded-full border border-red-400/20">
                <Activity size={16} /> The Threat Landscape
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">The $25 Million Problem.</h2>
              <p className="text-slate-400 text-lg leading-relaxed mb-6">
                Business Email Compromise (BEC) and AI Voice Cloning are bypassing traditional Accounts Payable approvals. If a hacker intercepts an invoice and changes the bank account on the PDF, standard ERP software won't catch it.
              </p>
              <p className="text-slate-400 text-lg leading-relaxed mb-10">
                Your AP Clerk assumes the invoice is real. Your CFO approves it because the amount looks correct. The money hits an offshore account, and your bank tells you it's irrevocable.
              </p>
              <a href="mailto:davidlucasonorigho@gmail.com?subject=ClearWire%20Enterprise%20Demo%20Request" className="inline-flex items-center gap-2 font-bold text-blue-400 hover:text-blue-300 transition-colors text-lg">
                See how ClearWire stops this <ChevronRight size={18} />
              </a>
            </div>
            
            {/* Visual Threat Model */}
            <div className="bg-[#1e293b]/50 p-8 rounded-3xl border border-white/10 relative backdrop-blur-sm">
              <div className="absolute -top-5 -right-5 bg-red-500/10 text-red-400 px-4 py-2 rounded-full font-bold text-sm backdrop-blur-md flex items-center gap-2 border border-red-500/20 shadow-2xl">
                <AlertTriangle size={16} /> Fake Invoice Detected
              </div>
              <div className="space-y-6">
                <div className="p-6 bg-[#020617]/50 rounded-xl border border-white/5">
                  <div className="text-xs font-bold text-slate-500 uppercase mb-2">Expected Vendor Details</div>
                  <div className="font-mono text-slate-300">IBAN: **** **** **** 8821</div>
                </div>
                <div className="flex justify-center">
                  <div className="bg-red-500/10 p-3 rounded-full border border-red-500/20">
                    <Zap className="text-red-400" size={24} />
                  </div>
                </div>
                <div className="p-6 bg-red-950/20 rounded-xl border border-red-500/20 relative overflow-hidden">
                  <div className="absolute inset-0 bg-red-500/5 animate-pulse"></div>
                  <div className="relative z-10">
                    <div className="text-xs font-bold text-red-400 uppercase mb-2">Received Payload (Threat)</div>
                    <div className="font-mono text-lg font-bold text-white">IBAN: **** **** **** 4099</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="py-32 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">A Zero-Trust Architecture.</h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-xl font-light">
              We mathematically eliminate the human vulnerabilities in your payment approval chain.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-[#0f172a] p-10 rounded-3xl border border-white/5 hover:border-blue-500/30 transition-colors group relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-8 border border-blue-500/20">
                <AlertTriangle className="text-blue-400" size={32} />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Behavioral Risk Engine</h3>
              <p className="text-slate-400 leading-relaxed font-light">
                Our system dynamically learns your Vendor Master Data. If an AP Clerk enters a bank account or SWIFT code that differs from historical records, the transaction is instantly assigned a 100-point penalty and frozen.
              </p>
            </div>
            
            <div className="bg-[#0f172a] p-10 rounded-3xl border border-white/5 hover:border-emerald-500/30 transition-colors group relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-8 border border-emerald-500/20">
                <Fingerprint className="text-emerald-400" size={32} />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Hardware Passkeys</h3>
              <p className="text-slate-400 leading-relaxed font-light">
                Say goodbye to hackable email approvals. CFOs authorize frozen wires using their phone's native hardware Secure Enclave (FaceID / TouchID). If a hacker intercepts the approval link, they physically cannot sign it.
              </p>
            </div>

            <div className="bg-[#0f172a] p-10 rounded-3xl border border-white/5 hover:border-purple-500/30 transition-colors group relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="w-16 h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center mb-8 border border-purple-500/20">
                <FileText className="text-purple-400" size={32} />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">WORM Audit Logs</h3>
              <p className="text-slate-400 leading-relaxed font-light">
                Every state transition generates a cryptographic hash locked into a Write-Once-Read-Many database. It provides a legally binding Chain of Custody to satisfy your cyber-insurance compliance requirements.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-blue-600"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-6xl font-bold mb-8 text-white tracking-tight">Ready to secure your treasury?</h2>
          <p className="text-blue-100 text-xl mb-12 max-w-2xl mx-auto font-light leading-relaxed">
            Join the forward-thinking finance teams who sleep soundly knowing their outbound wires are cryptographically verified.
          </p>
          <a href="mailto:davidlucasonorigho@gmail.com?subject=ClearWire%20Enterprise%20Demo%20Request" className="inline-flex bg-white text-blue-600 hover:bg-slate-50 px-10 py-5 rounded-2xl text-xl font-bold transition-all shadow-2xl hover:scale-105 items-center gap-3">
            Schedule a Live Demo <ChevronRight size={24} />
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#020617] py-12 px-6 text-center border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-white">
            <ShieldCheck className="text-blue-500" size={24} />
            <span>ClearWire</span>
          </div>
          <p className="text-slate-500 text-sm">
            © {new Date().getFullYear()} ClearWire Security. All rights reserved.
          </p>
          <div className="text-slate-400 text-sm font-medium hover:text-white transition-colors">
            davidlucasonorigho@gmail.com
          </div>
        </div>
      </footer>
    </div>
  );
}
