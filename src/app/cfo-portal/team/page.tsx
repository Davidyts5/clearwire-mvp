"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, Users, Mail, UserPlus, Loader2, Copy, Check } from "lucide-react";
import Link from "next/link";

export default function TeamManagement() {
  const [team, setTeam] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Form state
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("clerk");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [magicLink, setMagicLink] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchTeam();
  }, []);

  const fetchTeam = async () => {
    try {
      const res = await fetch('/api/team/invites');
      const json = await res.json();
      if (json.success) {
        setTeam(json.data.teamMembers);
        setInvites(json.data.pendingInvites);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMagicLink("");
    
    try {
      const res = await fetch('/api/team/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role })
      });
      const json = await res.json();
      
      if (json.success) {
        setMagicLink(json.magicLink);
        setEmail("");
        fetchTeam(); // Refresh the lists
      } else {
        alert(json.error);
      }
    } catch (err) {
      alert("Failed to send invite");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(magicLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto mt-10 px-4 sm:px-6 lg:px-8 space-y-6">
      <div className="bg-slate-900 text-white p-6 rounded-xl flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <Users size={32} className="text-blue-400" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Team Management</h1>
            <p className="text-slate-400 text-sm">Control access and approval matrices</p>
          </div>
        </div>
        <Link href="/cfo-portal" className="text-sm font-medium text-slate-300 hover:text-white underline">
          &larr; Back to Portal
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Invite Form */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
            <UserPlus size={20} className="text-blue-600" /> Invite New Member
          </h2>
          <form onSubmit={handleInvite} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" placeholder="employee@company.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Role / Permissions</label>
              <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none text-sm">
                <option value="clerk">AP Clerk (Can draft wires)</option>
                <option value="controller">Controller (Can approve up to $10k)</option>
                <option value="cfo">CFO / Executive (Full Multi-Sig)</option>
              </select>
            </div>
            <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2 rounded-lg flex items-center justify-center gap-2 transition-colors">
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
              Send Secure Invite
            </button>
          </form>

          {/* Magic Link Box (For MVP Demo) */}
          {magicLink && (
            <div className="mt-6 bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <p className="text-xs font-semibold text-emerald-800 mb-2">Invite Generated!</p>
              <p className="text-xs text-emerald-600 mb-3">In production, this is emailed automatically. For the demo, copy the link below and send it to your staff member to set their password.</p>
              <div className="flex items-center gap-2">
                <input readOnly value={magicLink} className="flex-1 bg-white border border-emerald-200 text-xs px-2 py-1.5 rounded outline-none text-slate-500" />
                <button onClick={copyToClipboard} className="bg-emerald-600 text-white p-1.5 rounded hover:bg-emerald-700">
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Active Team & Pending Invites */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Active Users */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2"><ShieldCheck size={18} className="text-emerald-500" /> Active Team Members</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-white border-b border-slate-100 text-slate-500">
                  <tr><th className="px-6 py-3">Name</th><th className="px-6 py-3">Email</th><th className="px-6 py-3">Role</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? <tr><td colSpan={3} className="px-6 py-8 text-center"><Loader2 className="animate-spin mx-auto text-slate-400" /></td></tr> :
                   team.length === 0 ? <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-500">No active members</td></tr> :
                   team.map(user => (
                    <tr key={user.id} className="hover:bg-slate-50">
                      <td className="px-6 py-3 font-medium text-slate-900">{user.full_name}</td>
                      <td className="px-6 py-3 text-slate-500">{user.email}</td>
                      <td className="px-6 py-3">
                        <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-medium uppercase tracking-wider">{user.role}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pending Invites */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2"><Mail size={18} className="text-amber-500" /> Pending Invites</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-white border-b border-slate-100 text-slate-500">
                  <tr><th className="px-6 py-3">Email</th><th className="px-6 py-3">Role</th><th className="px-6 py-3 text-right">Expires</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? <tr><td colSpan={3} className="px-6 py-8 text-center"><Loader2 className="animate-spin mx-auto text-slate-400" /></td></tr> :
                   invites.length === 0 ? <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-500">No pending invites</td></tr> :
                   invites.map(invite => (
                    <tr key={invite.id} className="hover:bg-slate-50">
                      <td className="px-6 py-3 text-slate-900">{invite.email}</td>
                      <td className="px-6 py-3">
                        <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-medium uppercase tracking-wider">{invite.role}</span>
                      </td>
                      <td className="px-6 py-3 text-right text-slate-500 text-xs">
                        {new Date(invite.expires_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
