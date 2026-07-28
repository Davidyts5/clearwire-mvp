"use client";

import { useState } from "react";
import { Stamp, Loader2, Building2, User, Mail, Lock, CheckCircle2, ShieldAlert } from "lucide-react";
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

    if (payload.password !== payload.confirmPassword) {
      setError("Passwords do not match.");
      setIsSubmitting(false);
      return;
    }
    delete payload.confirmPassword;

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
      <div className="min-h-screen bg-ink font-body text-parchment flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-brass/30">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <div className="w-20 h-20 bg-verified/20 border border-verified/50 text-verified rounded-none flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-3xl font-bold font-display text-parchment mb-2">Check your email</h2>
          <p className="text-muted mb-8">
            We've sent a secure verification link to your inbox. Please click the link to activate your ClearWire workspace and sign in.
          </p>
          <Link href="/login" className="flex w-full justify-center rounded-none border border-transparent bg-brass py-3 px-4 text-sm font-bold text-ink hover:bg-parchment transition-colors">
            Return to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink font-body text-parchment flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-brass/30">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Stamp size={48} className="mx-auto text-brass mb-4" />
        <h2 className="mt-2 text-center text-3xl font-bold tracking-tight font-display text-parchment">
          Create Workspace
        </h2>
        <p className="mt-2 text-center text-sm text-muted">
          Register your company and configure the first Administrator account.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-panel py-8 px-4 sm:px-10 border border-brass/30">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-wax text-parchment p-3 rounded-none text-sm font-medium border border-wax flex items-start gap-2">
                <ShieldAlert className="shrink-0 mt-0.5" size={16} />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-muted uppercase tracking-wider mb-2 font-mono">Company Name</label>
              <div className="mt-1 relative">
                <Building2 className="absolute left-3 top-2.5 text-muted/70" size={18} />
                <input required name="companyName" className="block w-full appearance-none rounded-none border border-brass/50 bg-ink pl-10 pr-3 py-2 text-parchment placeholder-muted/50 focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass sm:text-sm" placeholder="Acme Corporation" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-muted uppercase tracking-wider mb-2 font-mono">Full Name</label>
              <div className="mt-1 relative">
                <User className="absolute left-3 top-2.5 text-muted/70" size={18} />
                <input required name="fullName" className="block w-full appearance-none rounded-none border border-brass/50 bg-ink pl-10 pr-3 py-2 text-parchment placeholder-muted/50 focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass sm:text-sm" placeholder="Jane Doe" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-muted uppercase tracking-wider mb-2 font-mono">Business Email</label>
              <div className="mt-1 relative">
                <Mail className="absolute left-3 top-2.5 text-muted/70" size={18} />
                <input required type="email" name="email" className="block w-full appearance-none rounded-none border border-brass/50 bg-ink pl-10 pr-3 py-2 text-parchment placeholder-muted/50 focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass sm:text-sm" placeholder="jane@acme.com" />
              </div>
            </div>

            
            <div>
              <label className="block text-sm font-semibold text-muted uppercase tracking-wider mb-2 font-mono">Secure Password</label>
              <div className="mt-1 relative">
                <Lock className="absolute left-3 top-2.5 text-muted/70" size={18} />
                <input required type="password" name="password" minLength={12} className="block w-full appearance-none rounded-none border border-brass/50 bg-ink pl-10 pr-3 py-2 text-parchment placeholder-muted/50 focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass sm:text-sm" placeholder="Minimum 12 characters" />
              </div>
              
              <label className="block text-sm font-semibold text-muted uppercase tracking-wider mb-2 font-mono mt-4">Confirm Password</label>
              <div className="mt-1 relative">
                <Lock className="absolute left-3 top-2.5 text-muted/70" size={18} />
                <input required type="password" name="confirmPassword" minLength={12} className="block w-full appearance-none rounded-none border border-brass/50 bg-ink pl-10 pr-3 py-2 text-parchment placeholder-muted/50 focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass sm:text-sm" placeholder="Re-enter password" />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full justify-center rounded-none border border-transparent bg-brass py-2.5 px-4 text-sm font-bold text-ink hover:bg-parchment focus:outline-none disabled:opacity-70 gap-2 items-center transition-colors"
              >
                {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                Provision Secure Workspace
              </button>
            </div>
          </form>
        </div>

        <div className="mt-8 text-center space-y-2">
          <p className="text-muted text-sm">
            Already have an account? <Link href="/login" className="font-bold text-brass hover:text-parchment hover:underline">Sign in securely</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
