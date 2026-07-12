"use client";

import { useState, useEffect } from "react";
import { User, Fingerprint, ShieldAlert, ShieldCheck, Loader2, AlertTriangle, Monitor, Trash2, Edit2, Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { startRegistration, startAuthentication } from "@simplewebauthn/browser";
import { Permissions } from "@/lib/roles";
import { getDeviceMetadata } from "@/lib/device-utils";

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [devices, setDevices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [renamingDevice, setRenamingDevice] = useState<any>(null);
  const [newName, setNewName] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);
  
  const [isRegistering, setIsRegistering] = useState(false);
  const [revokingDevice, setRevokingDevice] = useState<any>(null);
  const [isRevoking, setIsRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const supabase = createClient();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        setError("User session not found.");
        return;
      }
      
      const { data: userData } = await supabase.from('users').select('*').eq('id', session.user.id).single();
      setUser({ ...userData, email: session.user.email });

      const res = await fetch(`/api/auth/devices?t=${Date.now()}`);
      const json = await res.json();
      
      if (json.success) {
        setDevices(json.data || []);
      } else {
        setError(json.error || "Failed to load authenticators");
      }
    } catch (err) {
      setError("An unexpected error occurred while fetching your profile.");
    } finally { 
      setIsLoading(false); 
    }
  };

  useEffect(() => { fetchData(); }, []);

  
  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRenameError(null);
    const trimmedName = newName.trim();
    
    if (!trimmedName) {
      setRenameError("Device name cannot be empty.");
      return;
    }
    if (trimmedName.length > 50) {
      setRenameError("Device name cannot exceed 50 characters.");
      return;
    }

    setIsRenaming(true);
    try {
      const res = await fetch(`/api/auth/devices/${renamingDevice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_name: trimmedName })
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to rename device.");
      }

      setSuccessMessage("Device renamed successfully.");
      setRenamingDevice(null);
      fetchData(); // refresh list
    } catch (err: any) {
      setRenameError(err.message || "An error occurred while renaming.");
    } finally {
      setIsRenaming(false);
    }
  };

  const handleRevokeSubmit = async () => {
    setIsRevoking(true);
    setRevokeError(null);
    try {
      // 1. Generate challenge
      const genRes = await fetch(`/api/auth/devices/${revokingDevice.id}/revoke/generate`, { cache: 'no-store' });
      const genJson = await genRes.json();
      if (!genRes.ok) throw new Error(genJson.error || "Failed to start revocation authentication.");

      // 2. Browser ceremony
      let attResp;
      try {
        attResp = await startAuthentication(genJson);
      } catch (err: any) {
        if (err.name === 'NotAllowedError') throw new Error("Authentication was cancelled or timed out.");
        throw new Error("Hardware key verification failed.");
      }

      // 3. Verify and Revoke
      const verifyRes = await fetch(`/api/auth/devices/${revokingDevice.id}/revoke/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attResp),
      });
      const verifyJson = await verifyRes.json();

      if (!verifyRes.ok) throw new Error(verifyJson.error || "Failed to securely revoke device.");

      setSuccessMessage("Device revoked successfully.");
      setRevokingDevice(null);
      fetchData();
    } catch (err: any) {
      setRevokeError(err.message || "An error occurred during revocation.");
    } finally {
      setIsRevoking(false);
    }
  };

  const handleRegister = async () => {
    setIsRegistering(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      // 1. Generate options
      const genRes = await fetch('/api/auth/webauthn/register/generate', { cache: 'no-store' });
      const genJson = await genRes.json();
      
      if (!genRes.ok) {
        throw new Error(genJson.error || "Failed to start registration.");
      }

      // 2. Browser authentication ceremony
      let attResp;
      try {
        attResp = await startRegistration(genJson);
      } catch (err: any) {
        if (err.name === 'NotAllowedError') {
          throw new Error("Registration was cancelled or timed out.");
        }
        throw new Error("Hardware key or biometric registration failed.");
      }

      // 3. Verify
      const verifyRes = await fetch('/api/auth/webauthn/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: attResp, metadata: getDeviceMetadata() }),
      });
      const verifyJson = await verifyRes.json();

      if (!verifyRes.ok) {
        throw new Error(verifyJson.error || "Failed to securely verify the device.");
      }

      // 4. Success
      setSuccessMessage("New security device registered successfully.");
      fetchData(); // refresh list
      
    } catch (err: any) {
      setError(err.message || "An error occurred during registration.");
    } finally {
      setIsRegistering(false);
    }
  };

  if (isLoading) return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <User className="text-blue-600" size={32} /> Security Profile
        </h1>
        <p className="text-slate-500 mt-1">View your identity and cryptographic authenticators.</p>
      </div>

      {/* User Info Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-start gap-4">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold text-2xl">
            {user?.full_name ? String(user.full_name).charAt(0) : 'U'}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{user?.full_name || 'Unknown User'}</h2>
            <p className="text-slate-500 font-medium">{user?.email}</p>
            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 uppercase tracking-wide">
              Role: {user?.role || 'N/A'}
            </div>
          </div>
        </div>
      </div>

      {/* Security Devices Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Fingerprint className="text-blue-500" size={20} /> Security Devices
            </h2>
            <p className="text-sm text-slate-500">Hardware keys authorized to cryptographically sign wire transfers.</p>
          </div>
          
          {user && Permissions.canRegisterDevice(user.role) && (
            <button 
              onClick={handleRegister} 
              disabled={isRegistering}
              className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              {isRegistering ? <Loader2 size={16} className="animate-spin" /> : <span className="text-lg leading-none">+</span>}
              Register New Device
            </button>
          )}
        </div>
        
        <div className="p-0">
          {successMessage && (
            <div className="m-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-800 font-bold">
                <ShieldCheck size={18} /> {successMessage}
              </div>
              <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-800"><X size={16}/></button>
            </div>
          )}

          {error ? (
             <div className="p-8 text-center">
               <AlertTriangle className="mx-auto text-red-500 mb-3" size={32}/>
               <p className="text-slate-900 font-bold">Failed to load authenticators.</p>
               <p className="text-slate-500 text-sm">{error}</p>
             </div>
          ) : devices.length === 0 ? (
            <div className="p-8 text-center">
              <ShieldAlert className="mx-auto text-amber-500 mb-3" size={32}/>
              <p className="text-slate-900 font-bold">No registered security devices.</p>
              <p className="text-slate-500 text-sm">You currently do not have any active hardware keys or biometrics.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {devices.map((device) => (
                <li key={device.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${device.revoked ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                      {device.revoked ? <ShieldAlert size={24} /> : <ShieldCheck size={24} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <ShieldCheck size={14} className="text-slate-400" />
                        <h3 className="font-bold text-slate-900">{device.device_name || 'Security Key'}</h3>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${device.revoked ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'}`}>
                          {device.revoked ? 'Revoked' : 'Active'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Monitor size={12} className="text-slate-400" />
                        <span className="text-xs font-semibold text-slate-600">{device.browser || 'Unknown Browser'} &bull; {device.os || 'Unknown Device'}</span>
                      </div>
                      <div className="flex flex-wrap gap-4 mt-2">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Created: {new Date(device.created_at).toLocaleDateString()}</span>
                        <span className="text-[10px] uppercase font-bold text-slate-400">Last Used: {device.last_used_at ? new Date(device.last_used_at).toLocaleDateString() : "Never"}</span>
                        {device.revoked && device.revoked_at && (
                          <span className="text-[10px] uppercase font-bold text-red-500">Revoked Date: {new Date(device.revoked_at).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {!device.revoked && (
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => { setRenamingDevice(device); setNewName(device.device_name || "Security Key"); setRenameError(null); }}
                        className="text-sm font-semibold text-slate-400 hover:text-blue-600 transition-colors px-3 py-1.5 border border-transparent hover:border-blue-200 hover:bg-blue-50 rounded-lg"
                      >
                        Rename
                      </button>
                      <button 
                        onClick={() => { setRevokingDevice(device); setRevokeError(null); }}
                        className="text-sm font-semibold text-slate-400 hover:text-red-600 transition-colors px-3 py-1.5 border border-transparent hover:border-red-200 hover:bg-red-50 rounded-lg"
                      >
                        Revoke
                      </button>
                    </div>
                  )}
                </li>

              ))}
            </ul>
          )}
        </div>
      </div>

      {renamingDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2"><Edit2 size={20} className="text-blue-500" /> Rename Device</h2>
              <button onClick={() => setRenamingDevice(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleRenameSubmit} className="p-6 space-y-4">
              {renameError && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg border border-red-200 text-sm flex items-start gap-2">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <span>{renameError}</span>
                </div>
              )}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Friendly Name</label>
                <input 
                  type="text" 
                  autoFocus
                  required
                  maxLength={50}
                  value={newName} 
                  onChange={(e) => setNewName(e.target.value)} 
                  className="w-full border p-2 rounded outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                  placeholder="e.g. David's MacBook"
                />
                <p className="text-xs text-slate-500 mt-2">Current name: <span className="font-mono">{renamingDevice.device_name}</span></p>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setRenamingDevice(null)} className="px-4 py-2 font-medium text-slate-600 hover:text-slate-900 text-sm">Cancel</button>
                <button type="submit" disabled={isRenaming} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-bold text-sm shadow-sm flex items-center gap-2 transition-colors">
                  {isRenaming ? <Loader2 size={16} className="animate-spin" /> : "Save Name"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {revokingDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2 text-red-600"><ShieldAlert size={20} /> Revoke Security Device</h2>
              <button onClick={() => setRevokingDevice(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm font-medium text-slate-700">
                Revoking this device will immediately prevent it from being used for future authentication and cryptographic approvals. This action is recorded in the audit log.
              </p>
              
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <span className="block text-xs font-bold text-slate-400 uppercase">Device to Revoke</span>
                <span className="font-bold text-slate-900">{revokingDevice.device_name || 'Security Key'}</span>
              </div>

              {revokeError && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg border border-red-200 text-sm flex items-start gap-2">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <span>{revokeError}</span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button onClick={() => setRevokingDevice(null)} className="px-4 py-2 font-medium text-slate-600 hover:text-slate-900 text-sm">Cancel</button>
                <button onClick={handleRevokeSubmit} disabled={isRevoking} className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-bold text-sm shadow-sm flex items-center gap-2 transition-colors">
                  {isRevoking ? <Loader2 size={16} className="animate-spin" /> : <Fingerprint size={16} />}
                  {isRevoking ? "Verifying..." : "Revoke Device"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}