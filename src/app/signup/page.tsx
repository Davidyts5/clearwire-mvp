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
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Check your email</h2>
          <p className="text-slate-500 mb-8">
            We've sent a secure verification link to your inbox. Please click the link to activate your ClearWire workspace and sign in.
          </p>
          <Link href="/login" className="flex w-full justify-center rounded-md border border-transparent bg-slate-900 py-3 px-4 text-sm font-medium text-white shadow-sm hover:bg-slate-800 transition-colors">
            Return to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <ShieldCheck size={48} className="mx-auto text-blue-600 mb-2" />
        <h2 className="mt-2 text-center text-3xl font-bold tracking-tight text-slate-900">
          Create Workspace
        </h2>
        <p className="mt-2 text-center text-sm text-slate-500">
          Register your company and configure the first Administrator account.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-slate-200">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm font-medium border border-red-200 flex items-start gap-2">
                <ShieldAlert className="shrink-0 mt-0.5" size={16} />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700">Company Name</label>
              <div className="mt-1 relative">
                <Building2 className="absolute left-3 top-2.5 text-slate-400" size={18} />
                <input required name="companyName" className="block w-full appearance-none rounded-md border border-slate-300 pl-10 pr-3 py-2 placeholder-slate-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm" placeholder="Acme Corporation" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Full Name</label>
              <div className="mt-1 relative">
                <User className="absolute left-3 top-2.5 text-slate-400" size={18} />
                <input required name="fullName" className="block w-full appearance-none rounded-md border border-slate-300 pl-10 pr-3 py-2 placeholder-slate-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm" placeholder="Jane Doe" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Business Email</label>
              <div className="mt-1 relative">
                <Mail className="absolute left-3 top-2.5 text-slate-400" size={18} />
                <input required type="email" name="email" className="block w-full appearance-none rounded-md border border-slate-300 pl-10 pr-3 py-2 placeholder-slate-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm" placeholder="jane@acme.com" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Secure Password</label>
              <div className="mt-1 relative">
                <Lock className="absolute left-3 top-2.5 text-slate-400" size={18} />
                <input required type="password" name="password" minLength={12} className="block w-full appearance-none rounded-md border border-slate-300 pl-10 pr-3 py-2 placeholder-slate-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm" placeholder="Minimum 12 characters" />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-70 gap-2 items-center"
              >
                {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                Provision Secure Workspace
              </button>
            </div>
          </form>
        </div>

        <div className="mt-8 text-center space-y-2">
          <p className="text-slate-500 text-sm">
            Already have an account? <Link href="/login" className="font-bold text-blue-600 hover:underline">Sign in securely</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
