"use client";
import { useState, useEffect } from "react";
import { ShieldCheck, Loader2, ExternalLink, CheckCircle2, Clock, XCircle, Users, Settings } from "lucide-react";
import Link from "next/link";

export default function CFODashboard() {
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchWires = async () => {
      try {
        const cacheBuster = new Date().getTime();
        const res = await fetch(`/api/wires?t=${cacheBuster}`, { cache: 'no-store' });
        const json = await res.json();
        if (json.success) {
          const sorted = json.data.sort((a: any, b: any) => {
            const aAction = a.status === 'pending' || a.status === 'frozen';
            const bAction = b.status === 'pending' || b.status === 'frozen';
            if (aAction && !bAction) return -1;
            if (!aAction && bAction) return 1;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          });
          setRequests(sorted);
        }
      } catch (err) {} finally { setIsLoading(false); }
    };
    fetchWires();
  }, []);

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
          <Link href="/cfo-portal/team" className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-700 px-4 py-2 rounded-lg text-sm font-medium"><Users size={16} className="text-blue-400" /> Team</Link>
          <Link href="/cfo-portal/settings" className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-700 px-4 py-2 rounded-lg text-sm font-medium"><Settings size={16} className="text-slate-300" /> Policies</Link>
          <Link href="/cfo-portal/devices" className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-700 px-4 py-2 rounded-lg text-sm font-medium">Device Registration</Link>
          <div className="text-sm font-medium bg-blue-900/50 text-blue-200 border border-blue-800/50 px-4 py-2 rounded-lg uppercase">Role: CFO</div>
        </div>
      </div>
      
      <div className="bg-white p-6 sm:p-8 rounded-b-xl shadow-sm border border-t-0 border-slate-200">
        <div className="flex justify-between items-end mb-6">
          <h2 className="text-xl font-bold text-slate-900">Wire Authorization Queue</h2>
          {pendingCount > 0 && <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full border border-amber-200 animate-pulse">{pendingCount} Action Required</span>}
        </div>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
              <tr><th className="px-6 py-4">Action</th><th className="px-6 py-4">Vendor</th><th className="px-6 py-4">Amount</th><th className="px-6 py-4">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? <tr><td colSpan={4} className="px-6 py-12 text-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto" /></td></tr> : 
               requests.length === 0 ? <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-500 font-medium bg-slate-50">No wires.</td></tr> : 
               requests.map((req) => {
                const canApprove = req.status === 'pending' || req.status === 'frozen';
                return (
                  <tr key={req.id} className={`hover:bg-slate-50 transition-colors ${canApprove ? 'bg-blue-50/30' : ''}`}>
                    <td className="px-6 py-4 font-mono text-xs">
                      <Link href={`/approve/${req.id}`} className={`flex items-center gap-1 font-semibold underline ${canApprove ? 'text-blue-600 hover:text-blue-800' : 'text-slate-500 hover:text-slate-700'}`}>
                        {canApprove ? 'Review & Sign' : 'View Record'} <ExternalLink size={12} />
                      </Link>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">{req.vendor_name_snapshot}</td>
                    <td className="px-6 py-4 text-slate-900 font-semibold">${Number(req.amount).toLocaleString()}</td>
                    <td className="px-6 py-4">{req.status}</td>
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
