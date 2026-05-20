"use client";

import { useState } from "react";
import { ShieldCheck, Fingerprint, Lock, AlertTriangle, CheckCircle } from "lucide-react";
import { startAuthentication } from "@simplewebauthn/browser";

export default function ApprovalScreen({ params }: { params: { id: string } }) {
  const [status, setStatus] = useState<"pending" | "verifying" | "approved" | "error">("pending");
  
  // In a real app, this is fetched from the DB based on params.id
  const wireDetails = {
    id: params.id || "REQ-002",
    vendor: "AWS Web Services",
    amount: 24000.00,
    requester: "Jane Doe (AP Clerk)",
    timestamp: new Date().toLocaleString(),
    antiAiPhrase: "PURPLE ELEPHANT BATTERY"
  };

  const handlePasskeyAuth = async () => {
    setStatus("verifying");
    
    try {
      // Mocking the passkey flow for the MVP demo.
      // In production, we'd fetch options from our Next.js API, 
      // pass them to startAuthentication, and verify the response.
      
      /*
      const resp = await fetch('/api/generate-authentication-options');
      const options = await resp.json();
      const authResult = await startAuthentication(options);
      await fetch('/api/verify-authentication', { method: 'POST', body: JSON.stringify(authResult) });
      */

      // Simulate network / cryptographic delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      setStatus("approved");
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  };

  if (status === "approved") {
    return (
      <div className="max-w-md mx-auto mt-10 bg-white p-8 rounded-2xl shadow-sm border border-emerald-200 text-center">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={32} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Cryptographically Signed</h2>
        <p className="text-slate-500 mb-6">
          The wire to {wireDetails.vendor} has been securely authorized. A PDF certificate has been sent to the AP dashboard.
        </p>
        <div className="bg-slate-50 p-4 rounded-lg font-mono text-xs text-slate-500 break-all text-left border border-slate-200">
          HASH: 0x9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08
          <br/>
          DEVICE: Apple iPhone (FaceID)
          <br/>
          TIME: {new Date().toISOString()}
        </div>
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
            <span className="font-semibold text-slate-900 text-right">{wireDetails.vendor}</span>
          </div>
          <div className="flex justify-between items-end border-b border-slate-100 pb-3">
            <span className="text-sm text-slate-500">Amount</span>
            <span className="text-2xl font-bold text-slate-900 tracking-tight">${wireDetails.amount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-end border-b border-slate-100 pb-3">
            <span className="text-sm text-slate-500">Requested By</span>
            <span className="font-medium text-slate-700">{wireDetails.requester}</span>
          </div>
        </div>

        {wireDetails.amount > 20000 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
              <div>
                <h4 className="text-sm font-semibold text-amber-900">Anti-Deepfake Liveness Check</h4>
                <p className="text-xs text-amber-700 mt-1 mb-2">
                  High-value wires require vocal confirmation. Read this phrase aloud if on a video call:
                </p>
                <div className="bg-white px-3 py-2 rounded border border-amber-200 font-mono text-center font-bold text-slate-800 tracking-wider">
                  {wireDetails.antiAiPhrase}
                </div>
              </div>
            </div>
          </div>
        )}

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
                Sign with Passkey (FaceID/TouchID)
              </div>
              <span className="text-xs text-blue-200 font-medium">Cryptographically secure signature</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
