"use client";

import { useState } from "react";
import { ShieldCheck, Fingerprint, Loader2 } from "lucide-react";
import { startRegistration } from "@simplewebauthn/browser";

export default function RegisterDevice() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleRegister = async () => {
    setStatus("loading");
    setErrorMsg("");

    try {
      const resOptions = await fetch("/api/auth/webauthn/register/generate");
      const options = await resOptions.json();
      if (!resOptions.ok || options.error) throw new Error(options.error || "Failed to generate options");

      const attResp = await startRegistration(options);

      const resVerify = await fetch("/api/auth/webauthn/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(attResp),
      });

      const verification = await resVerify.json();
      if (verification.success) {
        setStatus("success");
      } else {
        throw new Error(verification.error || "Verification failed");
      }
    } catch (err: any) {
      console.error(err);
      setStatus("error");
      setErrorMsg(err.message || "Failed to register device.");
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 px-4">
      <div className="bg-slate-900 text-white p-6 rounded-t-xl flex items-center gap-3">
        <ShieldCheck size={32} className="text-emerald-400" />
        <h1 className="text-2xl font-bold tracking-tight">Device Registration</h1>
      </div>
      
      <div className="bg-white p-8 rounded-b-xl shadow-sm border border-t-0 border-slate-200 text-center">
        <div className="w-20 h-20 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-6">
          <Fingerprint size={40} />
        </div>
        
        <h2 className="text-xl font-bold text-slate-900 mb-2">Register this Authenticator</h2>
        <p className="text-slate-500 mb-8 max-w-md mx-auto">
          To cryptographically sign wire transfers, you must register this device's hardware Secure Enclave. This binds your identity to this physical device.
        </p>

        {status === "success" ? (
          <div className="bg-emerald-50 text-emerald-700 p-4 rounded-lg font-medium border border-emerald-200">
            Device successfully registered! You can now authorize wires.
          </div>
        ) : (
          <button 
            onClick={handleRegister}
            disabled={status === "loading"}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 px-8 rounded-lg flex items-center justify-center gap-2 mx-auto"
          >
            {status === "loading" ? <Loader2 className="animate-spin" size={20} /> : <Fingerprint size={20} />}
            {status === "loading" ? "Scanning Biometrics..." : "Register Device with FaceID / TouchID"}
          </button>
        )}

        {status === "error" && (
          <div className="mt-4 text-red-600 text-sm font-medium">{errorMsg}</div>
        )}
      </div>
    </div>
  );
}
