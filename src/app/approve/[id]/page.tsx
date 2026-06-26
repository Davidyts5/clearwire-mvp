"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, Fingerprint, Lock, AlertTriangle, CheckCircle, XCircle, Search, Loader2, FileText, ArrowLeft } from "lucide-react";
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

  // Rejection Modal State
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState("Needs Correction (Amount/Vendor)");
  const [declineNotes, setDeclineNotes] = useState("");

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
        setStatus(json.data.status); // Set status early so Clerks can see "denied" state
        
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return setStatus("unauthorized");

        const { data: userData } = await supabase.from('users').select('role').eq('id', session.user.id).single();
        if (userData) setUserRole(userData.role);

        // Fetch vendor details for fraud comparison if available
        if (json.data.vendor_id) {
          const { data: vData } = await supabase.from('vendors').select('*').eq('id', json.data.vendor_id).single();
          if (vData) setVendorDetails(vData);
        }

        // Fetch Secure Invoice URL if an invoice was attached
        if (json.data.invoice_path) {
          const { data: urlData } = await supabase.storage.from('invoices').createSignedUrl(json.data.invoice_path, 3600);
          if (urlData?.signedUrl) setInvoiceUrl(urlData.signedUrl);
        }

        // If the user is a clerk or auditor, they can view the wire details (like rejection notes), but cannot approve
        if (!json.canApprove) {
           // We keep the status as what it is (e.g. 'denied') so they can see the record,
           // but the UI will hide the action buttons based on `json.canApprove`.
           // We only throw "unauthorized" if they try to access a pending wire they don't own.
        }

      } catch (err: any) {
        setErrorMsg(err.message || "Failed to connect to secure server.");
        setStatus("error");
      }
    };
    
    fetchWireAndVerifyRole();
  }, [params.id]);

  const handleDeclineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowDeclineModal(false);
    setStatus("loading");
    try {
      const res = await fetch(`/api/wires/${params.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'decline', reason: declineReason, notes: declineNotes })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Server rejected action");
      
      if (json.success) {
        setWireDetails({...wireDetails, rejection_reason: declineReason, rejection_notes: declineNotes});
        setStatus('denied');
      }
    } catch (err: any) {
      alert(err.message || "Failed to update state.");
      setStatus(wireDetails?.status || "error");
    }
  };

  const handleReview = async () => {
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
  
  if (status === "unauthorized") return (
    <div className="text-center mt-20 text-red-500 font-medium max-w-md mx-auto p-6 bg-red-50 rounded-xl border border-red-200">
      <ShieldCheck size={48} className="mx-auto text-red-400 mb-3" />
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
      <p className="text-sm text-slate-600">Your account role or approval limit does not authorize you to cryptographically sign this wire transfer.</p>
      <Link href={Permissions.getPortalRoute(userRole as any)} className="mt-4 inline-block text-blue-600 font-medium hover:underline text-sm">Return to Portal</Link>
    </div>
  );

  let riskReasons: string[] = [];
  try { if (wireDetails?.risk_reasons) riskReasons = JSON.parse(wireDetails.risk_reasons); } catch (e) {}

  return (
    <div className="max-w-md mx-auto mt-6 bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 mb-20">
      
      {/* Dynamic Header */}
      <div className={`p-6 text-center relative ${status === 'approved' ? 'bg-emerald-600 text-white' : status === 'denied' ? 'bg-red-600 text-white' : 'bg-slate-900 text-white'}`}>
        <Link href={Permissions.getPortalRoute(userRole as any)} className="absolute top-4 left-4 text-white/70 hover:text-white"><ArrowLeft size={20}/></Link>
        {status === 'approved' ? <CheckCircle size={48} className="mx-auto mb-3 text-emerald-200" /> : status === 'denied' ? <XCircle size={48} className="mx-auto mb-3 text-red-200" /> : <ShieldCheck size={48} className="mx-auto text-blue-400 mb-3" />}
        <h1 className="text-xl font-bold tracking-tight">
          {status === 'approved' ? 'Cryptographically Signed' : status === 'denied' ? 'Transfer Declined' : 'Authorization Required'}
        </h1>
        {status === 'pending' || status === 'frozen' || status === 'under_review' ? <p className="text-white/70 text-sm mt-1">Out-of-band wire verification</p> : null}
      </div>

      <div className="p-6 space-y-6">
        
        {/* Core Wire Details */}
        <div className="space-y-3">
          <div className="flex justify-between items-end border-b border-slate-100 pb-3">
            <span className="text-sm text-slate-500">Pay To</span>
            <span className="font-semibold text-slate-900">{wireDetails.vendor_name_snapshot}</span>
          </div>
          <div className="flex justify-between items-end border-b border-slate-100 pb-3">
            <span className="text-sm text-slate-500">Amount</span>
            <span className="text-2xl font-bold text-slate-900">${Number(wireDetails.amount).toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-end border-b border-slate-100 pb-3">
            <span className="text-sm text-slate-500">Purpose</span>
            <span className="font-medium text-slate-700 truncate max-w-[200px]" title={wireDetails.purpose}>{wireDetails.purpose}</span>
          </div>
        </div>

        {/* Source Document Panel */}
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
            <div className="flex items-center gap-2"><FileText size={20} /><span className="font-medium text-sm">No Document Attached</span></div>
          </div>
        )}

        {/* FROZEN STATE: Fraud Investigation Panel */}
        {wireDetails.risk_score >= 90 && status === 'frozen' && (
          <div className="bg-red-50 border border-red-300 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4 border-b border-red-200 pb-3">
              <AlertTriangle className="text-red-600" size={20} />
              <h3 className="font-bold text-red-900 text-lg">Fraud Freeze</h3>
              <span className="ml-auto bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">Score: {wireDetails.risk_score}/100</span>
            </div>

            {(wireDetails.account_number_snapshot !== vendorDetails?.account_number || wireDetails.swift_bic_snapshot !== vendorDetails?.swift_bic) && (
              <div className="space-y-4 mb-4">
                <p className="text-sm text-red-800 font-medium leading-snug">The bank account details entered by the AP Clerk do not match the historical records for this vendor.</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-white p-3 rounded border border-slate-200">
                    <span className="block text-xs font-bold text-slate-400 uppercase mb-1">Expected (Safe)</span>
                    <div className="font-mono text-slate-600 truncate" title={vendorDetails?.account_number}>{vendorDetails?.account_number || "None"}</div>
                  </div>
                  <div className="bg-red-100 p-3 rounded border border-red-300">
                    <span className="block text-xs font-bold text-red-800 uppercase mb-1">Received (Threat)</span>
                    <div className="font-mono text-red-900 font-bold truncate" title={wireDetails.account_number_snapshot}>{wireDetails.account_number_snapshot || "None"}</div>
                  </div>
                </div>
              </div>
            )}
            <ul className="mt-2 list-disc list-inside text-xs text-red-800 space-y-1">
              {riskReasons.map((reason, idx) => (<li key={idx}>{reason}</li>))}
            </ul>
          </div>
        )}

        {/* Standard Wire View (If not frozen) */}
        {status !== 'frozen' && (
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Target Account</span>
              <span className="font-mono text-slate-900 font-medium truncate max-w-[200px]" title={wireDetails.account_number_snapshot}>{wireDetails.account_number_snapshot || 'N/A'}</span>
            </div>
          </div>
        )}

        {/* SUCCESS STATE */}
        {status === 'approved' && (
          <div className="bg-emerald-50 p-4 rounded-lg font-mono text-xs text-emerald-800 break-all text-left border border-emerald-200">
            <strong>FIDO2 HASH:</strong><br/>{wireDetails.cryptographic_hash}
          </div>
        )}

        {/* DECLINED STATE: Show the Clerk exactly why it was rejected */}
        {status === 'denied' && wireDetails.rejection_reason && (
          <div className="bg-red-50 p-4 rounded-lg border border-red-200 space-y-3">
            <div>
              <span className="block text-xs font-bold text-red-800 uppercase mb-1">Rejection Reason</span>
              <span className="text-sm font-medium text-red-900">{wireDetails.rejection_reason}</span>
            </div>
            {wireDetails.rejection_notes && (
              <div>
                <span className="block text-xs font-bold text-red-800 uppercase mb-1">Executive Notes</span>
                <span className="text-sm text-red-800 italic">"{wireDetails.rejection_notes}"</span>
              </div>
            )}
          </div>
        )}

        {/* ACTION BUTTONS (Only visible to authorized Approvers while pending) */}
        {(status === 'pending' || status === 'frozen' || status === 'under_review') && Permissions.canApproveWire(userRole as any) && (
          <div className="space-y-3 pt-4 border-t border-slate-100">
            {status === 'frozen' ? (
              <button onClick={handleReview} className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-xl py-3 font-semibold flex items-center justify-center gap-2 shadow-sm">
                <Search size={18} /> Accept Risk & Unfreeze
              </button>
            ) : (
              <button onClick={handlePasskeyAuth} disabled={status === "verifying"} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl py-4 font-semibold flex items-center justify-center gap-2 shadow-md">
                {status === "verifying" ? <Loader2 className="animate-spin" /> : <Fingerprint />} Sign with Passkey
              </button>
            )}

            <button onClick={() => setShowDeclineModal(true)} className="w-full bg-white hover:bg-red-50 text-red-700 font-semibold rounded-xl py-3 border border-red-200 flex items-center justify-center gap-2">
              <XCircle size={18} /> Decline Request
            </button>
          </div>
        )}
      </div>

      {/* REJECTION MODAL */}
      {showDeclineModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 bg-red-50">
              <h2 className="text-lg font-bold text-red-900">Decline Wire Request</h2>
            </div>
            <form onSubmit={handleDeclineSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Reason for Rejection</label>
                <select value={declineReason} onChange={(e) => setDeclineReason(e.target.value)} className="w-full border border-slate-300 p-2 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-red-500">
                  <option value="Needs Correction (Amount/Vendor)">Needs Correction (Amount/Vendor)</option>
                  <option value="Duplicate Request">Duplicate Request</option>
                  <option value="Project on Hold / Cancelled">Project on Hold / Cancelled</option>
                  <option value="CRITICAL: Suspected Fraud">CRITICAL: Suspected Fraud</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Notes for AP Clerk (Optional)</label>
                <textarea value={declineNotes} onChange={(e) => setDeclineNotes(e.target.value)} placeholder="e.g. You added an extra zero to this invoice." className="w-full border border-slate-300 p-2 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-red-500 h-20 resize-none"></textarea>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowDeclineModal(false)} className="px-4 py-2 text-sm font-medium text-slate-600">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg flex items-center gap-2">
                  Decline & Notify Clerk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
