import Link from "next/link";
import { ShieldCheck, Lock, FileText, AlertTriangle, Fingerprint, ChevronRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-200">
      {/* Navigation */}
      <nav className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
          <ShieldCheck className="text-blue-400" size={28} />
          <span>ClearWire</span>
        </div>
        <Link href="/login" className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm">
          Sign In
        </Link>
      </nav>

      {/* Hero Section */}
      <section className="bg-slate-900 text-white pt-20 pb-32 px-4 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[500px] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-bold uppercase tracking-widest mb-8">
            <Lock size={14} /> Enterprise Payment Security
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
            Stop Deepfake Wire Fraud <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">Before It Happens.</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            ClearWire helps finance teams detect risky payment changes, enforce approval policies, and keep a mathematically immutable audit trail before money leaves the company.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="mailto:your.email@gmail.com?subject=ClearWire%20Demo%20Request" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl text-lg font-bold transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2">
              Request a Demo <ChevronRight size={20} />
            </a>
          </div>
        </div>
      </section>

      {/* The Problem / Solution Section */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">The $25 Million Problem</h2>
            <p className="text-slate-600 max-w-2xl mx-auto text-lg">
              Business Email Compromise (BEC) and AI Voice Cloning are bypassing traditional AP approvals. If a hacker intercepts an invoice and changes the bank account, standard software won't catch it.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200">
              <AlertTriangle className="text-amber-500 mb-4" size={40} />
              <h3 className="text-xl font-bold text-slate-900 mb-3">1. AI Risk Engine</h3>
              <p className="text-slate-600 leading-relaxed">
                Our system learns your Vendor Master Data. If an AP Clerk enters a bank account or IBAN that differs from historical records, the transaction is instantly frozen.
              </p>
            </div>
            <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200">
              <Fingerprint className="text-blue-600 mb-4" size={40} />
              <h3 className="text-xl font-bold text-slate-900 mb-3">2. Cryptographic Passkeys</h3>
              <p className="text-slate-600 leading-relaxed">
                Say goodbye to hackable email approvals. CFOs authorize frozen wires using their phone's native hardware Secure Enclave (FaceID / TouchID).
              </p>
            </div>
            <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200">
              <FileText className="text-emerald-600 mb-4" size={40} />
              <h3 className="text-xl font-bold text-slate-900 mb-3">3. WORM Audit Logs</h3>
              <p className="text-slate-600 leading-relaxed">
                Every state transition generates a cryptographic hash locked into an immutable database, providing a legally binding Chain of Custody for your insurance provider.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 py-12 text-center border-t border-slate-800">
        <div className="flex items-center justify-center gap-2 font-bold text-xl tracking-tight text-white mb-4">
          <ShieldCheck className="text-blue-400" size={24} />
          <span>ClearWire</span>
        </div>
        <p className="text-slate-500 text-sm">
          Built for modern finance teams. <br/>© {new Date().getFullYear()} ClearWire Security. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
