"use client";
import { useState, useEffect } from "react";
import { ShieldCheck, Loader2, ExternalLink } from "lucide-react";
import Link from "next/link";

export default function AuditorDashboard() {
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchWires = async () => {
      try {
        const cacheBuster = new Date().getTime();
        const res = await fetch(`/api/wires?t=${cacheBuster}`, { cache: 'no-store' });
        const json = await res.json();
        if (json.success) setRequests(json.data);
      } catch (err) {} finally { setIsLoading(false); }
    };
    fetchWires();
  }, []);

  return (
    <div className="max-w-5xl mx-auto mt-10 px-4 sm:px-6 lg:px-8">
      <div className="bg-slate-900 text-white p-6 rounded-t-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <ShieldCheck size={32} className="text-blue-400" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Compliance & Audit Portal</h1>
            <p className="text-slate-400 text-sm">Read-only immutable records</p>
          </div>
        </div>
        <div className="text-sm font-medium bg-blue-900/50 text-blue-200 px-4 py-2 rounded-lg uppercase">Role: AUDITOR</div>
      </div>
      
      <div className="bg-white p-6 sm:p-8 rounded-b-xl shadow-sm border border-t-0 border-slate-200">
        <h2 className="text-xl font-bold text-slate-900 mb-6">Historical Wire Log</h2>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
              <tr><th className="px-6 py-4">Audit Record</th><th className="px-6 py-4">Vendor</th><th className="px-6 py-4">Amount</th><th className="px-6 py-4">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? <tr><td colSpan={4} className="px-6 py-12 text-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto" /></td></tr> : 
               requests.length === 0 ? <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-500 font-medium bg-slate-50">No wires.</td></tr> : 
               requests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs">
                      <a href={`/api/pdf/${req.id}`} target="_blank" className="flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-800 underline">View PDF <ExternalLink size={12} /></a>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">{req.vendor_name_snapshot}</td>
                    <td className="px-6 py-4 text-slate-900 font-semibold">${Number(req.amount).toLocaleString()}</td>
                    <td className="px-6 py-4">{req.status}</td>
                  </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
