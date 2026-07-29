"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, Users, Mail, UserPlus, Loader2, Copy, Check, Pencil, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function TeamManagement() {
  const [team, setTeam] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("clerk");
  const [approvalLimit, setApprovalLimit] = useState(10000);
  const [canUnfreeze, setCanUnfreeze] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [magicLink, setMagicLink] = useState("");
  const [invitedEmail, setInvitedEmail] = useState("");
  const [copied, setCopied] = useState(false);

  // Edit Modal State
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editLimit, setEditLimit] = useState(0);
  const [editCanUnfreeze, setEditCanUnfreeze] = useState(false);
  const [isSavingLimit, setIsSavingLimit] = useState(false);

  useEffect(() => { fetchTeam(); }, []);

  
  const handleCancelInvite = async (id: string) => {
    try {
      const res = await fetch(`/api/team/invites/manage/${id}`, { method: 'DELETE' });
      if (res.ok) fetchTeam();
    } catch (err) {}
  };

  const handleResendInvite = async (id: string) => {
    try {
      const res = await fetch(`/api/team/invites/manage/${id}`, { method: 'PUT' });
      const json = await res.json();
      if (json.success) {
        setMagicLink(json.magicLink);
        fetchTeam();
      }
    } catch (err) {}
  };

  const fetchTeam = async () => {
    try {
      const res = await fetch(`/api/team/invites?t=${new Date().getTime()}`, { cache: 'no-store' });
      const json = await res.json();
      if (json.success) {
        setTeam(json.data.teamMembers);
        setInvites(json.data.teamInvites);
      }
    } catch (err) { console.error(err); } finally { setIsLoading(false); }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMagicLink("");
    
    try {
      const res = await fetch('/api/team/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          full_name: fullName,
          email, 
          role,
          approval_limit: role === 'controller' ? approvalLimit : 0,
          can_unfreeze: role === 'controller' ? canUnfreeze : false
        })
      });
      const json = await res.json();
      if (json.success) {
        setInvitedEmail(email);
        setMagicLink(json.magicLink);
        setEmail("");
        setFullName("");
        fetchTeam(); 
      } else alert(json.error);
    } catch (err) { alert("Failed to send invite"); } finally { setIsSubmitting(false); }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(magicLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUpdateLimit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsSavingLimit(true);
    
    try {
      const res = await fetch(`/api/team/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          approval_limit: Number(editLimit),
          can_unfreeze: editCanUnfreeze
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Server rejected update");
      if (json.success) {
        setEditingUser(null);
        fetchTeam(); 
      } else throw new Error(json.error || "Update failed silently");
    } catch (err: any) { alert(err.message || "Failed to update limit"); } finally { setIsSavingLimit(false); }
  };

  const openEditModal = (user: any) => {
    setEditingUser(user);
    setEditLimit(user.approval_limit || 0);
    setEditCanUnfreeze(user.can_unfreeze || false);
  };

  return (
    <div className="max-w-5xl mx-auto mt-10 px-4 sm:px-6 lg:px-8 space-y-6">
      <div className="bg-slate-900 text-white p-6 rounded-xl flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <Users size={32} className="text-blue-400" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Team Management</h1>
            <p className="text-slate-400 text-sm">Control access and user-specific approval limits</p>
          </div>
        </div>
        <Link href="/cfo-dashboard" className="text-sm font-medium text-slate-300 hover:text-white underline">
          &larr; Back to Portal
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
            <UserPlus size={20} className="text-blue-600" /> Invite New Member
          </h2>
          <form onSubmit={handleInvite} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Full Name</label>
            <input required type="text" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full border border-slate-200 p-2.5 rounded-lg focus:outline-none focus:border-blue-500" placeholder="Jane Doe" />
          </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm" placeholder="employee@company.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Role / Permissions</label>
              <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none text-sm">
                <option value="clerk">AP Clerk (Can draft wires)</option>
                <option value="controller">Controller (Can approve up to limit)</option>
                <option value="cfo">CFO / Executive (Full Multi-Sig)</option>
                <option value="auditor">Auditor (Read Only)</option>
              </select>
            </div>
            
            {role === 'controller' && (
              <div className="animate-in fade-in slide-in-from-top-2 space-y-4 border-t border-slate-100 pt-4 mt-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Max Approval Limit (USD)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-500">$</span>
                    <input required type="number" min="0" value={approvalLimit} onChange={(e) => setApprovalLimit(Number(e.target.value))} className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg outline-none text-sm" />
                  </div>
                </div>
                
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={canUnfreeze} onChange={(e) => setCanUnfreeze(e.target.checked)} className="mt-1" />
                    <div>
                      <span className="text-sm font-bold text-red-900 block">Delegate Unfreeze Authority</span>
                      <span className="text-xs text-red-700">Allow this controller to bypass the Risk Engine and unfreeze high-risk transactions (e.g. Bank Account changes).</span>
                    </div>
                  </label>
                </div>
              </div>
            )}

            <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2 rounded-lg flex items-center justify-center gap-2">
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />} Send Secure Invite
            </button>
          </form>

          
      {/* Historical Invitations */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Mail className="text-blue-500" size={24} /> Invitation History
            </h2>
            <p className="text-sm text-slate-500 mt-1">Manage pending, expired, and cancelled workspace invitations.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-xs">
              <tr>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Name & Email</th>
                <th className="px-6 py-4">Assigned Role</th>
                <th className="px-6 py-4">Expiry Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invites.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">No invitation history.</td></tr>
              ) : invites.map((inv: any) => (
                <tr key={inv.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      inv.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                      inv.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' :
                      inv.status === 'expired' ? 'bg-slate-100 text-slate-500' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900">{inv.full_name || 'N/A'}</div>
                    <div className="text-slate-500 text-xs">{inv.email}</div>
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-700 uppercase text-xs">{inv.role}</td>
                  <td className="px-6 py-4 text-slate-500 text-xs">{new Date(inv.expires_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right space-x-3">
                    {(inv.status === 'pending' || inv.status === 'expired' || inv.status === 'cancelled') && (
                      <button onClick={() => handleResendInvite(inv.id)} className="text-blue-600 hover:text-blue-800 font-bold text-xs transition-colors">Resend</button>
                    )}
                    {inv.status === 'pending' && (
                      <button onClick={() => handleCancelInvite(inv.id)} className="text-red-600 hover:text-red-800 font-bold text-xs transition-colors">Cancel</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {invitedEmail && (
        <div className="mt-6 bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <p className="text-sm font-semibold text-emerald-800">✓ Invite sent to {invitedEmail}</p>
          {magicLink && (
            <div className="mt-3 pt-3 border-t border-emerald-200">
              <p className="text-xs text-emerald-700 mb-1.5">
                Email delivery is still in test mode — if they don't receive it, share this link directly:
              </p>
              <div className="flex items-center gap-2">
                <input readOnly value={magicLink} className="flex-1 bg-white border border-emerald-200 text-xs px-2 py-1.5 rounded text-slate-500" />
                <button onClick={copyToClipboard} className="bg-emerald-600 text-white p-1.5 rounded hover:bg-emerald-700">
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2"><ShieldCheck size={18} className="text-emerald-500" /> Active Team Members</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-white border-b border-slate-100 text-slate-500">
                  <tr><th className="px-6 py-3">Name</th><th className="px-6 py-3">Role</th><th className="px-6 py-3 text-right">Approval Limit</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? <tr><td colSpan={3} className="px-6 py-8 text-center"><Loader2 className="animate-spin mx-auto text-slate-400" /></td></tr> :
                   team.length === 0 ? <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-500">No active members</td></tr> :
                   team.map(user => (
                    <tr key={user.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900 flex items-center gap-2">
                          {user.full_name}
                          {user.can_unfreeze && <AlertTriangle size={14} className="text-red-500"  />}
                        </div>
                        <div className="text-xs text-slate-500">{user.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-medium uppercase tracking-wider">{user.role}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {user.role === 'controller' ? (
                          <button onClick={() => openEditModal(user)} className="inline-flex flex-col items-end gap-1 text-slate-900 hover:text-blue-600 group">
                            <div className="font-semibold flex items-center gap-1">${Number(user.approval_limit).toLocaleString()} <Pencil size={12} className="text-slate-300 group-hover:text-blue-600" /></div>
                            {user.can_unfreeze && <span className="text-[10px] text-red-600 font-bold tracking-wide">CAN UNFREEZE</span>}
                          </button>
                        ) : user.role === 'cfo' ? (
                          <span className="text-emerald-600 font-semibold text-xs uppercase tracking-wider">Unlimited</span>
                        ) : <span className="text-slate-400 text-xs">$0 (Draft Only)</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold">Edit Controller Limits</h2>
              <p className="text-sm text-slate-500 mt-1">{editingUser.full_name}</p>
            </div>
            <form onSubmit={handleUpdateLimit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">New Limit (USD)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-500">$</span>
                  <input required type="number" min="0" value={editLimit} onChange={(e) => setEditLimit(Number(e.target.value))} className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg" />
                </div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={editCanUnfreeze} onChange={(e) => setEditCanUnfreeze(e.target.checked)} className="mt-1" />
                  <div>
                    <span className="text-sm font-bold text-red-900 block">Delegate Unfreeze Authority</span>
                    <span className="text-xs text-red-700">Allow bypassing the Risk Engine.</span>
                  </div>
                </label>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setEditingUser(null)} className="px-4 py-2 text-sm font-medium text-slate-600">Cancel</button>
                <button type="submit" disabled={isSavingLimit} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg flex items-center gap-2">
                  {isSavingLimit ? <Loader2 size={16} className="animate-spin" /> : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
