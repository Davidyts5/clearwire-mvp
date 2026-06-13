"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, Fingerprint, Lock, AlertTriangle, CheckCircle, XCircle, Search, Loader2 } from "lucide-react";
import Link from "next/link";
import { startAuthentication } from "@simplewebauthn/browser";
import { supabase } from "@/lib/supabase";
import { ROLES, Permissions } from "@/lib/roles";

export default function ApprovalScreen({ params }: { params: { id: string } }) {
  const [status, setStatus] = useState<string>("loading");
  const [wireDetails, setWireDetails] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("Invalid Wire Request.");

  useEffect(() => {
    const fetchWireAndVerifyRole = async () => {
      try {
        const cacheBuster = new Date().getTime();
        const res = await fetch(`/api/wires/${params.id}?t=${cacheBuster}`, { cache: 'no-store' });
        const json = await res.json();
        
        if (!json.success) {
          setErrorMsg(json.error || "Wire request not found or access denied.");
          return setStatus("error");
        }
        
        setWireDetails(json.data);

        if (!json.canApprove) return setStatus("unauthorized");

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return setStatus("unauthorized");

        const { data: userData } = await supabase
          .from('users')
          .select('role, approval_limit')
          .eq('id', session.user.id)
          .single();

        if (!userData) return setStatus("unauthorized");
        setUserRole(userData.role);

        if (Permissions.isReadOnly(userData.role as any) || userData.role === ROLES.CLERK) {
          return setStatus("unauthorized");
        }

        if (userData.role === ROLES.CONTROLLER) {
          const limit = Number(userData.approval_limit || 0);
          const amount = Number(json.data.amount);
          if (amount > limit) return setStatus("unauthorized");
        }

        setStatus(json.data.status);
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to connect to secure server.");
        setStatus("error");
      }
    };
    
    fetchWireAndVerifyRole();
  }, [params.id]);

  const handleAction = async (action: 'decline' | 'review') => {
    if (action === 'decline' && !confirm("Are you sure you want to decline this wire?")) return;
    setStatus("loading");
    try {
      const res = await fetch(`/api/wires/${params.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Server rejected action");
      if (json.success) setStatus(json.data.status);
    } catch (err: any) {
      alert(err.message || "Failed to update state.");
      setStatus(wireDetails?.status || "error");
    }
  };

  const handlePasskeyAuth = async () => {
    setStatus("verifying");
    try {
      const resOptions = await fetch(`/api/wires/${params.id}/approve/generate`, { method: 'POST' });
      const options = await resOptions.json();
      if (!resOptions.ok) throw new Error(options.error || "Failed to generate passkey challenge");

      const authResp = await startAuthentication(options);

      const resVerify = await fetch(`/api/wires/${params.id}/approve/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authResp)
      });

      const verification = await resVerify.json();
      if (verification.success) {
        setWireDetails(verification.data);
        setStatus("approved");
      } else {
        throw new Error(verification.error || "Server rejected approval");
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Biometric verification failed.");
      setStatus(wireDetails?.status || "error");
    }
  };

  if (status === "loading") return <div className="text-center mt-20 text-slate-500 font-medium animate-pulse">Establishing Secure Connection...</div>;
  
  if (status === "error") return (
    <div className="text-center mt-20 text-red-500 font-medium max-w-md mx-auto p-6 bg-red-50 rounded-xl border border-red-200">
      <ShieldCheck size={48} className="mx-auto text-red-400 mb-3" />
      <p className="text-lg font-bold text-red-900 mb-1">Access Blocked</p>
      <p className="text-sm text-red-700">{errorMsg}</p>
      <Link href={Permissions.getPortalRoute(userRole as any)} className="mt-4 inline-block text-blue-600 font-medium hover:underline text-sm">Return to Dashboard</Link>
    </div>
  );
  
  if (status === "unauthorized") {
    return (
      <div className="max-w-md mx-auto mt-10 bg-white p-8 rounded-2xl shadow-sm border border-red-200 text-center">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldCheck size={32} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
        <p className="text-slate-500 mb-6">
          Your account role or approval limit does not authorize you to cryptographically sign this wire transfer.
        </p>
        <Link href={Permissions.getPortalRoute(userRole as any)} className="text-blue-600 font-medium hover:underline">Return to Portal</Link>
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div className="max-w-md mx-auto mt-10 bg-white p-8 rounded-2xl shadow-sm border border-red-200 text-center">
        <XCircle size={32} className="mx-auto text-red-600 mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Transfer Declined</h2>
        <Link href={Permissions.getPortalRoute(userRole as any)} className="text-blue-600 font-medium hover:underline">Return to Portal</Link>
      </div>
    );
  }

  if (status === "approved") {
    return (
      <div className="max-w-md mx-auto mt-10 bg-white p-8 rounded-2xl shadow-sm border border-emerald-200 text-center">
        <CheckCircle size={32} className="mx-auto text-emerald-600 mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Cryptographically Signed</h2>
        <div className="bg-slate-50 p-4 rounded-lg font-mono text-xs text-slate-500 break-all text-left mb-6">
          HASH: {wireDetails.cryptographic_hash}
        </div>
        <Link href={Permissions.getPortalRoute(userRole as any)} className="text-blue-600 font-medium hover:underline">Return to Portal</Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-6 bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
      <div className="bg-slate-900 text-white p-6 text-center relative">
        <ShieldCheck size={48} className="mx-auto text-blue-400 mb-3" />
        <h1 className="text-xl font-bold tracking-tight">Authorization Required</h1>
      </div>

      <div className="p-6 space-y-6">
        <div className="space-y-3">
          <div className="flex justify-between items-end border-b border-slate-100 pb-3">
            <span className="text-sm text-slate-500">Pay To</span>
            <span className="font-semibold text-slate-900">{wireDetails.vendor_name_snapshot}</span>
          </div>
          <div className="flex justify-between items-end border-b border-slate-100 pb-3">
            <span className="text-sm text-slate-500">Amount</span>
            <span className="text-2xl font-bold text-slate-900">${Number(wireDetails.amount).toLocaleString()}</span>
          </div>
        </div>

        {wireDetails.risk_score >= 90 && status === 'frozen' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
            <AlertTriangle className="inline mr-2" size={16} />
            <strong>Risk Engine Freeze.</strong> Score: {wireDetails.risk_score}/100. Must be placed under review before approval.
          </div>
        )}

        {status === 'under_review' && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
            <strong>Under Manual Review.</strong> This transaction is cleared for authorization.
          </div>
        )}

        <div className="space-y-3">
          {status === 'frozen' ? (
            <button onClick={() => handleAction('review')} className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-xl py-3 font-semibold flex items-center justify-center gap-2">
              <Search size={18} /> Initiate Security Review
            </button>
          ) : (
            <button onClick={handlePasskeyAuth} disabled={status === "verifying"} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl py-4 font-semibold flex items-center justify-center gap-2">
              {status === "verifying" ? <Loader2 className="animate-spin" /> : <Fingerprint />}
              Sign with Passkey
            </button>
          )}

          <button onClick={() => handleAction('decline')} className="w-full bg-red-50 hover:bg-red-100 text-red-700 font-semibold rounded-xl py-3 border border-red-200 flex items-center justify-center gap-2">
            <XCircle size={18} /> Decline & Flag
          </button>
        </div>
      </div>
    </div>
  );
}
