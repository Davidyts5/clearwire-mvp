"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, Loader2, CheckCircle2, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function InviteRegistration({ params }: { params: { token: string } }) {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "valid" | "success" | "error">("loading");
  const [inviteDetails, setInviteDetails] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchInvite = async () => {
      try {
        const res = await fetch(`/api/team/invites/${params.token}`);
        const json = await res.json();
        
        if (json.success) {
          setInviteDetails(json.data);
          setStatus("valid");
        } else {
          setErrorMsg(json.error);
          setStatus("error");
        }
      } catch (err) {
        setErrorMsg("Failed to connect to server");
        setStatus("error");
      }
    };
    
    fetchInvite();
  }, [params.token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }
    setIsSubmitting(true);
    
    try {
      const res = await fetch(`/api/team/invites/${params.token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, password })
      });
      const json = await res.json();
      
      if (json.success) {
        setStatus("success");
      } else {
        alert(json.error);
      }
    } catch (err) {
      alert("Failed to complete registration");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center text-slate-500 font-medium animate-pulse">Verifying Secure Invite...</div>;
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-slate-200 text-center">
          <ShieldCheck size={48} className="mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Invalid Invite Link</h2>
          <p className="text-slate-500 mb-6">{errorMsg}</p>
          <Link href="/login" className="text-blue-600 hover:underline font-medium">Return to Login</Link>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-slate-200 text-center">
          <CheckCircle2 size={48} className="mx-auto text-emerald-500 mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Account Created!</h2>
          <p className="text-slate-500 mb-6">Your access to {inviteDetails.companyName} has been successfully provisioned.</p>
          <Link href="/login" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg flex items-center justify-center transition-colors">
            Proceed to Login
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
          Accept Invitation
        </h2>
        <p className="mt-2 text-center text-sm text-slate-500">
          You have been invited to join <strong>{inviteDetails.companyName || 'your company'}</strong> as a <span className="uppercase font-semibold">{inviteDetails.role}</span>.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-slate-200">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-slate-700">Corporate Email</label>
              <div className="mt-1">
                <input disabled type="email" value={inviteDetails.email} className="block w-full appearance-none rounded-md border border-slate-300 px-3 py-2 bg-slate-50 text-slate-500 sm:text-sm cursor-not-allowed" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Full Name</label>
              <div className="mt-1">
                <input required type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" className="block w-full appearance-none rounded-md border border-slate-300 px-3 py-2 placeholder-slate-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm" />
              </div>
            </div>

            
            <div>
              <label className="block text-sm font-medium text-slate-700">Set Password</label>
              <div className="mt-1">
                <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 8 characters" minLength={8} className="block w-full appearance-none rounded-md border border-slate-300 px-3 py-2 placeholder-slate-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm" />
              </div>
              <label className="block text-sm font-medium text-slate-700 mt-4">Confirm Password</label>
              <div className="mt-1">
                <input required type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter password" minLength={8} className="block w-full appearance-none rounded-md border border-slate-300 px-3 py-2 placeholder-slate-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm" />
              </div>
            </div>

            <div>
              <button type="submit" disabled={isSubmitting} className="flex w-full justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-70 gap-2 items-center">
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                Create Secure Account
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
