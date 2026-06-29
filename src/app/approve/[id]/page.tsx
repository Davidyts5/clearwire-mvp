"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, Fingerprint, Lock, AlertTriangle, CheckCircle, XCircle, Search, Loader2, FileText, MessageSquare } from "lucide-react";
import Link from "next/link";
import { startAuthentication } from "@simplewebauthn/browser";
import { createClient } from "@/lib/supabase";
import { ROLES, Permissions } from "@/lib/roles";

export default function ApprovalScreen({ params }: { params: { id: string } }) {
  const [status, setStatus] = useState<string>("loading");
  const [wireDetails, setWireDetails] = useState<any>(null);
  const [vendorDetails, setVendorDetails] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("Invalid Wire Request.");
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);

  // Contextual Rejection State
  const [isDeclineModalOpen, setIsDeclineModalOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("Needs Correction (Amount/Vendor)");
  const [declineNotes, setDeclineNotes] = useState("");
  const [isSubmittingDecline, setIsSubmittingDecline] = useState(false);

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

        const supabase = createClient();

        if (json.data.vendor_id) {
          const { data: vData } = await supabase.from('vendors').select('*').eq('id', json.data.vendor_id).single();
          if (vData) setVendorDetails(vData);
        }

        if (json.data.invoice_path) {
          const { data: urlData } = await supabase.storage.from('invoices').createSignedUrl(json.data.invoice_path, 3600);
          if (urlData?.signedUrl) setInvoiceUrl(urlData.signedUrl);
        }

        if (!json.canApprove) return setStatus("unauthorized");

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return setStatus("unauthorized");

        const { data: userData } = await supabase.from('users').select('role, approval_limit, can_unfreeze').eq('id', session.user.id).single();
        if (!userData) return setStatus("unauthorized");
        setUserRole(userData.role);

        if (Permissions.isReadOnly(userData.role as any) || userData.role === ROLES.CLERK) {
          return setStatus("unauthorized");
        }

        if (userData.role === ROLES.CONTROLLER) {
          const limit = Number(userData.approval_limit || 0);
          const amount = Number(json.data.amount);
          if (amount > limit) return setStatus("unauthorized");

          if (json.data.status === 'frozen' && !userData.can_unfreeze) {
             return setStatus("unauthorized");
          }
        }

        setStatus(json.data.status);
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to connect to secure server.");
        setStatus("error");
      }
    };
    
    fetchWireAndVerifyRole();
  }, [params.id]);

  const handleReviewAction = async () => {
    setStatus("loading");
    try {
      const res = await fetch(`/api/wires/${params.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'review' })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Server rejected action");
      if (json.success) setStatus(json.data.status);
    } catch (err: any) {
      alert(err.message || "Failed to update state.");
      setStatus(wireDetails?.status || "error");
    }
  };

  const handleDeclineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingDecline(true);
    try {
      const res = await fetch(`/api/wires/${params.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'decline',
          rejection_reason: declineReason,
          rejection_notes: declineNotes
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Server rejected action");
      if (json.success) {
        setWireDetails(json.data);
        setStatus(json.data.status);
        setIsDeclineModalOpen(false);
      }
    } catch (err: any) {
      alert(err.message || "Failed to update state.");
      setIsSubmittingDecline(false);
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
          {wireDetails?.status === 'frozen' ? " This transaction is currently FROZEN and requires delegated CFO unfreeze authority." : ""}
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
        <div className="bg-red-50 p-4 rounded-lg text-sm text-red-800 text-left mb-6 border border-red-100">
          <p className="font-bold mb-1">Reason: {wireDetails?.rejection_reason || 'Declined'}</p>
          {wireDetails?.rejection_notes && <p className="italic text-slate-600">"{wireDetails.rejection_notes}"</p>}
        </div>
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

  let riskReasons: string[] = [];
  try { if (wireDetails.risk_reasons) riskReasons = JSON.parse(wireDetails.risk_reasons); } catch (e) {}

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
            <span className="text-sm text-slate-500">Bank Account</span>
            <span className="font-mono text-slate-900 text-sm">*{wireDetails.account_number_snapshot?.slice(-4) || 'N/A'}</span>
          </div>
          <div className="flex justify-between items-end border-b border-slate-100 pb-3">
            <span className="text-sm text-slate-500">Amount</span>
            <span className="text-2xl font-bold text-slate-900">${Number(wireDetails.amount).toLocaleString()}</span>
          </div>
        </div>

        {invoiceUrl ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-800">
              <FileText size={20} />
              <span className="font-semibold text-sm">Source Document</span>
            </div>
            <a href={invoiceUrl} target="_blank" rel="noopener noreferrer" className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded font-medium shadow-sm transition-colors">
              View Invoice
            </a>
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-center justify-between text-slate-500">
            <div className="flex items-center gap-2">
              <FileText size={20} />
              <span className="font-medium text-sm">No Document Attached</span>
            </div>
          </div>
        )}

        {wireDetails.risk_score >= 90 && status === 'frozen' && (
          <div className="bg-red-50 border border-red-300 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4 border-b border-red-200 pb-3">
              <AlertTriangle className="text-red-600" size={20} />
              <h3 className="font-bold text-red-900 text-lg">Fraud Freeze</h3>
              <span className="ml-auto bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">Score: {wireDetails.risk_score}/100</span>
            </div>

            {(wireDetails.account_number_snapshot !== vendorDetails?.account_number || wireDetails.swift_bic_snapshot !== vendorDetails?.swift_bic) && (
              <div className="space-y-4 mb-4">
                <p className="text-sm text-red-800 font-medium leading-snug">
                  The bank account details entered by the AP Clerk do not match the historical records for this vendor.
                </p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-white p-3 rounded border border-slate-200">
                    <span className="block text-xs font-bold text-slate-400 uppercase mb-1">Expected (Safe)</span>
                    <div className="font-mono text-slate-600 truncate" title={vendorDetails?.account_number}>{vendorDetails?.account_number || "None"}</div>
                    <div className="font-mono text-slate-400 text-xs mt-1">{vendorDetails?.swift_bic}</div>
                  </div>
                  <div className="bg-red-100 p-3 rounded border border-red-300">
                    <span className="block text-xs font-bold text-red-800 uppercase mb-1">Received (Threat)</span>
                    <div className="font-mono text-red-900 font-bold truncate" title={wireDetails.account_number_snapshot}>{wireDetails.account_number_snapshot || "None"}</div>
                    <div className="font-mono text-red-700 font-bold text-xs mt-1">{wireDetails.swift_bic_snapshot}</div>
                  </div>
                </div>
              </div>
            )}

            <ul className="mt-2 list-disc list-inside text-xs text-red-800 space-y-1">
              {riskReasons.map((reason, idx) => (
                <li key={idx}>{reason}</li>
              ))}
            </ul>
          </div>
        )}

        {status === 'under_review' && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
            <strong>Security Override Active.</strong> You have accepted the risk and cleared this transaction for final authorization.
          </div>
        )}

        <div className="space-y-3 pt-2">
          {status === 'frozen' ? (
            <button onClick={handleReviewAction} className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-xl py-3 font-semibold flex items-center justify-center gap-2 shadow-sm">
              <Search size={18} /> Accept Risk & Unfreeze
            </button>
          ) : (
            <button onClick={handlePasskeyAuth} disabled={status === "verifying"} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl py-4 font-semibold flex items-center justify-center gap-2 shadow-md">
              {status === "verifying" ? <Loader2 className="animate-spin" /> : <Fingerprint />}
              Sign with Passkey
            </button>
          )}

          <button onClick={() => setIsDeclineModalOpen(true)} className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold rounded-xl py-3 border border-slate-200 flex items-center justify-center gap-2 transition-colors">
            <XCircle size={18} /> Decline Request
          </button>
        </div>
      </div>

      {isDeclineModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold flex items-center gap-2"><XCircle className="text-slate-700" /> Decline Wire</h2>
              <p className="text-sm text-slate-500 mt-1">Provide feedback for the Accounts Payable team.</p>
            </div>
            <form onSubmit={handleDeclineSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Rejection Reason</label>
                <select 
                  value={declineReason} 
                  onChange={(e) => setDeclineReason(e.target.value)} 
                  className="w-full border p-2.5 rounded-lg text-sm bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Needs Correction (Amount/Vendor)">Needs Correction (Amount/Vendor)</option>
                  <option value="Duplicate Request">Duplicate Request</option>
                  <option value="Project on Hold / Cancelled">Project on Hold / Cancelled</option>
                  <option value="CRITICAL: Suspected Fraud" className="font-bold text-red-600">CRITICAL: Suspected Fraud</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Notes for AP Clerk (Optional)</label>
                <textarea 
                  value={declineNotes} 
                  onChange={(e) => setDeclineNotes(e.target.value)} 
                  rows={3}
                  className="w-full border p-2.5 rounded-lg text-sm bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 'Jane, the invoice amount doesn't match the PO.'"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsDeclineModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">Cancel</button>
                <button type="submit" disabled={isSubmittingDecline} className={`px-4 py-2 text-white text-sm font-medium rounded-lg flex items-center gap-2 ${declineReason.includes('CRITICAL') ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-800 hover:bg-slate-900'}`}>
                  {isSubmittingDecline ? <Loader2 size={16} className="animate-spin" /> : <MessageSquare size={16} />}
                  Submit Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
