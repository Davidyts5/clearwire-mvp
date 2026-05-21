"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, Fingerprint, Lock, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function ApprovalScreen({ params }: { params: { id: string } }) {
  const [status, setStatus] = useState<"loading" | "pending" | "verifying" | "approved" | "denied" | "error" | "unauthorized">("loading");
  const [wireDetails, setWireDetails] = useState<any>(null);

  useEffect(() => {
    const fetchWireAndVerifyRole = async () => {
      try {
        // 1. Fetch the wire details from the API
        const res = await fetch(`/api/wires/${params.id}`);
        const json = await res.json();
        
        if (!json.success) {
          setStatus("error");
          return;
        }
        
        setWireDetails(json.data);

        // 2. Check the logged-in user's role natively via Supabase client
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          // If they aren't logged in at all, they can't approve.
          setStatus("unauthorized");
          return;
        }

        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .single();

        // 3. ENFORCE ROLE-BASED ACCESS CONTROL (RBAC)
        if (userData?.role !== 'cfo') {
          setStatus("unauthorized");
          return;
        }

        // If they are a CFO, show the normal status
        setStatus(json.data.status);
        
      } catch (err) {
        setStatus("error");
      }
    };
    
    fetchWireAndVerifyRole();
  }, [params.id]);

  const handleDecline = async () => {
    if(!confirm("Are you sure you want to flag this wire as fraudulent and decline it?")) return;
    setStatus("loading");
    try {
      const res = await fetch(`/api/wires/${params.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'decline' })
      });
      const json = await res.json();
      if (json.success) setStatus("denied");
    } catch (err) {
      alert("Failed to decline.");
      setStatus("pending");
    }
  };

  const handlePasskeyAuth = async () => {
    setStatus("verifying");
    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      const userId = new Uint8Array(16);
      window.crypto.getRandomValues(userId);

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: challenge,
          rp: { name: "ClearWire Security", id: window.location.hostname },
          user: { id: userId, name: "cfo@clearwire", displayName: "Chief Financial Officer" },
          pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
          authenticatorSelection: { userVerification: "required" },
          timeout: 60000,
          attestation: "none"
        }
      });

      if (!credential) throw new Error("Biometric auth failed");

      const res = await fetch(`/api/wires/${params.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', credentialId: credential.id })
      });

      const json = await res.json();
      if (json.success) {
        setWireDetails(json.data); 
        setStatus("approved");
      } else {
        throw new Error("Server rejected approval");
      }
    } catch (err) {
      console.error(err);
      alert("Biometric verification canceled or failed.");
      setStatus("pending");
    }
  };

  if (status === "loading") return <div className="text-center mt-20 text-slate-500 font-medium animate-pulse">Establishing Secure Connection...</div>;
  if (status === "error" || !wireDetails) return <div className="text-center mt-20 text-red-500 font-medium">Invalid or Expired Wire Request.</div>;

  // NEW SECURITY BLOCK: Prevents AP Clerks from viewing the approval buttons
  if (status === "unauthorized") {
    return (
      <div className="max-w-md mx-auto mt-10 bg-white p-8 rounded-2xl shadow-sm border border-red-200 text-center">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldCheck size={32} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
        <p className="text-slate-500 mb-6">
          Your account role does not have authorization to cryptographically sign wire transfers. This action requires Executive (CFO) privileges.
        </p>
        <Link href="/dashboard" className="text-blue-600 font-medium hover:underline">Return to Dashboard</Link>
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div className="max-w-md mx-auto mt-10 bg-white p-8 rounded-2xl shadow-sm border border-red-200 text-center">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <XCircle size={32} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Transfer Declined</h2>
        <p className="text-slate-500 mb-6">
          You have flagged this wire to {wireDetails.vendor_name} as unauthorized. The AP Clerk has been notified.
        </p>
        <Link href="/dashboard" className="text-blue-600 font-medium hover:underline">Return to Dashboard</Link>
      </div>
    );
  }

  if (status === "approved") {
    return (
      <div className="max-w-md mx-auto mt-10 bg-white p-8 rounded-2xl shadow-sm border border-emerald-200 text-center">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={32} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Cryptographically Signed</h2>
        <p className="text-slate-500 mb-6">
          The wire to <span className="font-semibold text-slate-900">{wireDetails.vendor_name}</span> has been securely authorized.
        </p>
        <div className="bg-slate-50 p-4 rounded-lg font-mono text-xs text-slate-500 break-all text-left border border-slate-200 mb-6">
          HASH: {wireDetails.cryptographic_hash}
          <br/>TIME: {new Date(wireDetails.approved_at).toLocaleString()}
        </div>
        <Link href="/dashboard" className="text-blue-600 font-medium hover:underline">Return to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-6 bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
      <div className="bg-slate-900 text-white p-6 text-center relative">
        <div className="absolute top-4 right-4 flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full">
          <Lock size={12} /> E2E Encrypted
        </div>
        <ShieldCheck size={48} className="mx-auto text-blue-400 mb-3" />
        <h1 className="text-xl font-bold tracking-tight">Authorization Required</h1>
        <p className="text-slate-300 text-sm mt-1">Out-of-band wire verification</p>
      </div>

      <div className="p-6 space-y-6">
        <div className="space-y-3">
          <div className="flex justify-between items-end border-b border-slate-100 pb-3">
            <span className="text-sm text-slate-500">Pay To</span>
            <span className="font-semibold text-slate-900 text-right">{wireDetails.vendor_name}</span>
          </div>
          <div className="flex justify-between items-end border-b border-slate-100 pb-3">
            <span className="text-sm text-slate-500">Amount</span>
            <span className="text-2xl font-bold text-slate-900 tracking-tight">${Number(wireDetails.amount).toLocaleString()}</span>
          </div>
        </div>

        {Number(wireDetails.amount) > 10000 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
              <div>
                <h4 className="text-sm font-semibold text-amber-900">Anti-Deepfake Liveness Check</h4>
                <p className="text-xs text-amber-700 mt-1 mb-2">
                  High-value wires require vocal confirmation. Read this phrase aloud if on a video call:
                </p>
                <div className="bg-white px-3 py-2 rounded border border-amber-200 font-mono text-center font-bold text-slate-800 tracking-wider">
                  {wireDetails.anti_ai_phrase}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <button 
            onClick={handlePasskeyAuth}
            disabled={status === "verifying"}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl py-4 flex flex-col items-center justify-center gap-1 transition-all shadow-md shadow-blue-600/20"
          >
            {status === "verifying" ? (
              <span className="animate-pulse font-semibold text-lg">Verifying Biometrics...</span>
            ) : (
              <>
                <div className="flex items-center gap-2 font-semibold text-lg">
                  <Fingerprint size={20} />
                  Sign with Passkey
                </div>
                <span className="text-xs text-blue-200 font-medium">Hardware cryptographic signature</span>
              </>
            )}
          </button>

          <button 
            onClick={handleDecline}
            className="w-full bg-red-50 hover:bg-red-100 text-red-700 font-semibold rounded-xl py-3 flex items-center justify-center gap-2 transition-all border border-red-200"
          >
            <XCircle size={18} />
            Decline & Flag as Fraud
          </button>
        </div>
      </div>
    </div>
  );
}
