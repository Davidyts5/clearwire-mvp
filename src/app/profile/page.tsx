"use client";

import { useState, useEffect } from "react";
import { User, Fingerprint, ShieldAlert, Trash2, Edit2, Check, X, ShieldCheck, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase";

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [devices, setDevices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const fetchData = async () => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const { data: userData } = await supabase.from('users').select('*').eq('id', session.user.id).single();
      setUser({ ...userData, email: session.user.email });

      const res = await fetch(`/api/auth/devices?t=${Date.now()}`);
      const json = await res.json();
      if (json.success) setDevices(json.data);
    } catch (err) {} finally { setIsLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleRename = async (id: string) => {
    if (!editName.trim()) return setEditingId(null);
    try {
      const res = await fetch(`/api/auth/devices/${id}`, { method: 'PATCH', body: JSON.stringify({ name: editName }) });
      if (res.ok) {
        setDevices(devices.map(d => d.id === id ? { ...d, name: editName } : d));
      }
    } finally { setEditingId(null); }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm("Are you sure you want to revoke this security key? It will be permanently deleted.")) return;
    try {
      const res = await fetch(`/api/auth/devices/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setDevices(devices.filter(d => d.id !== id));
      }
    } catch (err) {}
  };

  if (isLoading) return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <User className="text-blue-600" size={32} /> Security Profile
        </h1>
        <p className="text-slate-500 mt-1">Manage your identity and cryptographic authenticators.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-start gap-4">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold text-2xl">
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{user?.full_name}</h2>
            <p className="text-slate-500 font-medium">{user?.email}</p>
            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 uppercase tracking-wide">
              Role: {user?.role}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Fingerprint className="text-blue-500" size={20} /> Registered Devices
            </h2>
            <p className="text-sm text-slate-500">Hardware keys authorized to cryptographically sign wire transfers.</p>
          </div>
          {/* Note: WebAuthn registration is typically handled in a dedicated flow or the existing setup. */}
          <Link href="/login" className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm">
            Register New Key
          </Link>
        </div>
        
        <div className="p-0">
          {devices.length === 0 ? (
            <div className="p-8 text-center">
              <ShieldAlert className="mx-auto text-amber-500 mb-3" size={32}/>
              <p className="text-slate-900 font-bold">No active authenticators.</p>
              <p className="text-slate-500 text-sm">You must register a hardware key or biometrics to approve wires.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {devices.map((device) => (
                <li key={device.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                      <ShieldCheck size={24} />
                    </div>
                    <div>
                      {editingId === device.id ? (
                        <div className="flex items-center gap-2">
                          <input autoFocus value={editName} onChange={e => setEditName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleRename(device.id)} className="border border-blue-300 rounded px-2 py-1 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500" />
                          <button onClick={() => handleRename(device.id)} className="text-emerald-600 hover:text-emerald-700 p-1"><Check size={16}/></button>
                          <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-600 p-1"><X size={16}/></button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-900">{device.name || 'Security Key'}</h3>
                          <button onClick={() => { setEditingId(device.id); setEditName(device.name || 'Security Key'); }} className="text-slate-400 hover:text-blue-600 transition-colors">
                            <Edit2 size={14} />
                          </button>
                        </div>
                      )}
                      <p className="text-xs text-slate-500 font-mono mt-1">ID: {device.id}</p>
                      <div className="flex gap-4 mt-2">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Created: {new Date(device.created_at).toLocaleDateString()}</span>
                        <span className="text-[10px] uppercase font-bold text-slate-400">Last Used: {new Date(device.last_used_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => handleRevoke(device.id)} className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors flex flex-col items-center gap-1 group">
                    <Trash2 size={20} />
                    <span className="text-[10px] font-bold uppercase opacity-0 group-hover:opacity-100 transition-opacity">Revoke</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
