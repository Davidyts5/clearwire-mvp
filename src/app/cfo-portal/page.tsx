"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, Loader2, ExternalLink, CheckCircle2, Clock, XCircle, Users, Settings } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { ROLES, Permissions } from "@/lib/roles";

type WireRequest = {
  id: string;
  vendor_name_snapshot: string;
  amount: number;
  purpose: string;
  status: "pending" | "approved" | "denied" | "frozen" | "under_review";
  created_at: string;
};

export default function CFOPortal() {
  const [requests, setRequests] = useState<WireRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [role, setRole] = useState<string>("");
  const [limit, setLimit] = useState<number>(0);

  useEffect(() => {
    const fetchWiresAndContext = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: userData } = await supabase
            .from('users')
            .select('role, approval_limit')
            .eq('id', session.user.id)
            .single();
            
          setRole(userData?.role || "");
          setLimit(userData?.approval_limit || 0);
        }

        const cacheBuster = new Date().getTime();
        const res = await fetch(`/api/wires?t=${cacheBuster}`, { cache: 'no-store' });
        const json = await res.json();
        
        if (json.success) {
          const sortedData = json.data.sort((a: WireRequest, b: WireRequest) => {
            const aNeedsAction = a.status === 'pending' || a.status === 'frozen';
            const bNeedsAction = b.status === 'pending' || b.status === 'frozen';
            
            if (aNeedsAction && !bNeedsAction) return -1;
            if (!aNeedsAction && bNeedsAction) return 1;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          });
          setRequests(sortedData);
        }
      } catch (err) {
        console.error("Failed to load wires");
      } finally {
        setIsLoading(false);
      }
    };
    fetchWiresAndContext();
  }, []);

  // Strict Routing Protection: Clerks should not access the Executive Portal
  if (!isLoading && role === ROLES.CLERK) {
    return (
      <div className="text-center mt-20 p-8 max-w-md mx-auto bg-white rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Wrong Portal</h2>
        <p className="text-slate-500 mb-6">This executive dashboard is restricted. Please return to the AP drafting dashboard.</p>
        <Link href={Permissions.getPortalRoute(role as any)} className="text-blue-600 font-medium hover:underline">
          Go to your AP Portal &rarr;
        </Link>
      </div>
    );
  }

  const pendingCount = requests.filter(r => r.status === 'pending' || r.status === 'frozen').length;

  return (
    <div className="max-w-5xl mx-auto mt-10 px-4 sm:px-6 lg:px-8">
      <div className="bg-slate-900 text-white p-6 rounded-t-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <ShieldCheck size={32} className="text-blue-400" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Executive Trust Portal</h1>
            <p className="text-slate-400 text-sm">Secure authorization environment</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {Permissions.canManageTeam(role as any) && (
            <Link href="/cfo-portal/team" className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-700 px-4 py-2 rounded-lg text-sm font-medium">
              <Users size={16} className="text-blue-400" /> Team
            </Link>
          )}
          {Permissions.canManageSettings(role as any) && (
            <Link href="/cfo-portal/settings" className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-700 px-4 py-2 rounded-lg text-sm font-medium">
              <Settings size={16} className="text-slate-300" /> Policies
            </Link>
          )}
          {Permissions.canRegisterDevice(role as any) && (
            <Link href="/cfo-portal/devices" className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-700 px-4 py-2 rounded-lg text-sm font-medium">
               Device Registration
            </Link>
          )}
          <div className="text-sm font-medium bg-blue-900/50 text-blue-200 border border-blue-800/50 px-4 py-2 rounded-lg uppercase">
            Role: {role} {role === ROLES.CONTROLLER && `(Max $${Number(limit).toLocaleString()})`}
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 sm:p-8 rounded-b-xl shadow-sm border border-t-0 border-slate-200">
        
        <div className="flex justify-between items-end mb-6">
          <h2 className="text-xl font-bold text-slate-900">Wire Authorization Queue</h2>
          {pendingCount > 0 && !Permissions.isReadOnly(role as any) && (
            <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full border border-amber-200 animate-pulse">
              {pendingCount} Action Required
            </span>
          )}
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
              <tr>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4">Vendor</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Purpose</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto" /></td></tr>
              ) : requests.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-medium bg-slate-50">No wires require action at this time.</td></tr>
              ) : requests.map((req) => {
                
                // Smart UI Rendering: Only show actionable links if the user is legally allowed to approve it
                const isPendingOrFrozen = req.status === 'pending' || req.status === 'frozen';
                let canClickToApprove = false;
                
                if (isPendingOrFrozen) {
                   if (role === ROLES.CFO) canClickToApprove = true;
                   if (role === ROLES.CONTROLLER && req.amount <= limit) canClickToApprove = true;
                }

                return (
                  <tr key={req.id} className={`hover:bg-slate-50 transition-colors ${canClickToApprove ? 'bg-blue-50/30' : ''}`}>
                    <td className="px-6 py-4 font-mono text-xs">
                      {Permissions.isReadOnly(role as any) ? (
                        <Link href={`/approve/${req.id}`} className="flex items-center gap-1 font-semibold text-slate-500 hover:text-slate-700 underline">
                          View Audit <ExternalLink size={12} />
                        </Link>
                      ) : role === ROLES.CONTROLLER && req.amount > limit ? (
                        <span className="text-slate-400 flex items-center gap-1 font-semibold cursor-not-allowed">Requires CFO <ExternalLink size={12} /></span>
                      ) : (
                        <Link href={`/approve/${req.id}`} className={`flex items-center gap-1 font-semibold underline ${canClickToApprove ? 'text-blue-600 hover:text-blue-800' : 'text-slate-500 hover:text-slate-700'}`}>
                          {canClickToApprove ? 'Review & Sign' : 'View Record'} <ExternalLink size={12} />
                        </Link>
                      )}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">{req.vendor_name_snapshot}</td>
                    <td className="px-6 py-4 text-slate-900 font-semibold">${Number(req.amount).toLocaleString()}</td>
                    <td className="px-6 py-4 text-slate-500 truncate max-w-[150px]">{req.purpose || '-'}</td>
                    <td className="px-6 py-4">
                      {req.status === "approved" && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200"><CheckCircle2 size={14} /> Approved</span>}
                      {req.status === "denied" && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200"><XCircle size={14} /> Declined</span>}
                      {req.status === "pending" && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200"><Clock size={14} /> Pending Auth</span>}
                      {req.status === "frozen" && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200"><AlertTriangle size={14} /> Frozen</span>}
                      {req.status === "under_review" && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200"><Clock size={14} /> Under Review</span>}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-500">
                      {new Date(req.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
