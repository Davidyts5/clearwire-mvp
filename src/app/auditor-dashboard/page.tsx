"use client";
import { useState, useEffect } from "react";
import { ShieldCheck, Loader2, Search, AlertTriangle, Activity, FileDigit, Settings, PlayCircle, Briefcase } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

export default function AuditorDashboard() {
  const [data, setData] = useState<any>({ stats: null, investigations: [], timeline: [] });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAuditData = async () => {
      try {
        const cacheBuster = new Date().getTime();
        const res = await fetch(`/api/audit/master?t=${cacheBuster}`, { cache: 'no-store' });
        const json = await res.json();
        if (json.success) setData(json);
      } catch (err) {} finally { setIsLoading(false); }
    };
    fetchAuditData();
  }, []);

  if (isLoading) return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-600 mb-2 font-bold uppercase tracking-wider text-xs">
            <ShieldCheck size={16} /> Read-Only Compliance View
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Enterprise Investigation Center</h1>
          <p className="text-slate-500 mt-1">Manage fraud cases, forensic replay, and automated risk workflows.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-lg"><AlertTriangle size={24}/></div>
          <div><p className="text-sm font-bold text-slate-500 uppercase">Active Cases</p><p className="text-2xl font-bold text-slate-900">{data.stats?.openInvestigations || 0}</p></div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-slate-100 text-slate-600 rounded-lg"><Briefcase size={24}/></div>
          <div><p className="text-sm font-bold text-slate-500 uppercase">Total Logged Cases</p><p className="text-2xl font-bold text-slate-900">{data.stats?.totalInvestigations || 0}</p></div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-lg"><Settings size={24}/></div>
          <div><p className="text-sm font-bold text-slate-500 uppercase">Policy Changes</p><p className="text-2xl font-bold text-slate-900">{data.stats?.policyChanges || 0}</p></div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column: Database-Backed Cases */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[600px]">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="font-bold text-slate-900 flex items-center gap-2"><Briefcase size={18} className="text-slate-600"/> Case Management</h2>
            </div>
            <div className="overflow-y-auto flex-1 p-2 space-y-2 bg-slate-50">
              {data.investigations.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">No cases found.</div>
              ) : data.investigations.map((inv: any) => (
                <Link href={`/auditor-dashboard/investigations/${inv.id}`} key={inv.id} className="block bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:border-blue-400 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-bold text-slate-500 font-mono">{inv.case_number}</span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${inv.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700 border border-red-200'}`}>{inv.status.replace('_', ' ')}</span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm mb-1">{inv.title}</h3>
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100">
                    <span className="text-[10px] font-medium text-slate-400">{new Date(inv.date).toLocaleDateString()}</span>
                    <span className="text-xs font-bold text-blue-600 flex items-center gap-1">Open Case <PlayCircle size={14}/></span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Global Unified Timeline */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-[600px] flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
              <FileDigit size={18} className="text-blue-500"/>
              <h2 className="font-bold text-slate-900">Live Immutable Audit Stream</h2>
            </div>
            <div className="overflow-y-auto flex-1">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase text-xs sticky top-0">
                  <tr><th className="px-6 py-3">Timestamp</th><th className="px-6 py-3">Event</th><th className="px-6 py-3">Actor</th><th className="px-6 py-3">Details</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.timeline.map((e: any) => (
                    <tr key={e.id} className="hover:bg-slate-50">
                      <td className="px-6 py-3 whitespace-nowrap text-xs font-medium text-slate-500">{new Date(e.timestamp).toLocaleString()}</td>
                      <td className="px-6 py-3"><span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-slate-200 bg-white">{e.title}</span></td>
                      <td className="px-6 py-3"><div className="font-semibold text-slate-900">{e.actorName}</div><div className="text-[10px] text-slate-500 uppercase">{e.actorRole}</div></td>
                      <td className="px-6 py-3"><div className="text-sm text-slate-700 line-clamp-2">{e.message}</div></td>
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
