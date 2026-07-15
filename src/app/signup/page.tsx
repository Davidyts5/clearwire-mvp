"use client";

import { useState } from "react";
import { ShieldCheck, Loader2, Building2, User, Mail, Lock, CheckCircle2, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationNeeded, setVerificationNeeded] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    try {
      const res = await fetch('/api/auth/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to create workspace.");
      }

      if (json.requiresEmailVerification) {
        setVerificationNeeded(true);
      } else {
        router.push('/dashboard');
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (verificationNeeded) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden p-8 text-center animate-in zoom-in-95 duration-500">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Check your email</h2>
          <p className="text-slate-500 mb-8">
            We've sent a secure verification link to your inbox. Please click the link to activate your ClearWire workspace and sign in.
          </p>
          <Link href="/login" className="block w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-xl transition-colors">
            Return to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* Left Side - Brand & Pitch */}
      <div className="lg:flex-1 bg-slate-900 text-white p-8 lg:p-16 flex flex-col justify-between hidden sm:flex">
        <div>
          <div className="flex items-center gap-2 font-bold text-2xl tracking-tight mb-16">
            <ShieldCheck className="text-blue-400" size={32} />
            <span>ClearWire</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold leading-tight mb-6">
            Secure your treasury.<br />
            <span className="text-blue-400">Deploy zero-trust workflows in seconds.</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-xl">
            Create your enterprise workspace to instantly enable multi-signature approvals, WORM audit logging, and cryptographic risk protection for outbound payments.
          </p>
        </div>
        <div className="text-slate-500 text-sm">
          &copy; {new Date().getFullYear()} ClearWire Security Systems. Enterprise Beta.
        </div>
      </div>

      {/* Right Side - Registration Form */}
      <div className="lg:w-[600px] flex flex-col justify-center p-8 lg:p-16 bg-white min-h-screen lg:min-h-0 shadow-2xl relative z-10">
        
        <div className="sm:hidden flex items-center gap-2 font-bold text-2xl tracking-tight mb-8">
          <ShieldCheck className="text-blue-600" size={28} />
          <span className="text-slate-900">ClearWire</span>
        </div>

        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Create Workspace</h2>
          <p className="text-slate-500">Register your company and configure the first Administrator account.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm font-medium border border-red-100 flex items-start gap-2">
              <ShieldAlert className="shrink-0" size={18} />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Company Name</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-3 text-slate-400" size={20} />
              <input required name="companyName" className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" placeholder="Acme Corporation" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-3 text-slate-400" size={20} />
              <input required name="fullName" className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" placeholder="Jane Doe" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Business Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-slate-400" size={20} />
              <input required type="email" name="email" className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" placeholder="jane@acme.com" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Secure Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-slate-400" size={20} />
              <input required type="password" name="password" minLength={12} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" placeholder="Minimum 12 characters" />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting} 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2 mt-2"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : "Provision Secure Workspace"}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-slate-500 text-sm">
            Already have an account? <Link href="/login" className="font-bold text-blue-600 hover:underline">Sign in securely</Link>
          </p>
        </div>

      </div>
    </div>
  );
}


