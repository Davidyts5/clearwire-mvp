"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, Loader2, ExternalLink, CheckCircle2, Clock, XCircle } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type WireRequest = {
  id: string;
  vendor_name: string;
  amount: number;
  purpose: string;
  status: "pending" | "approved" | "denied";
  created_at: string;
};

export default function CFOPortal() {
  const [requests, setRequests] = useState<WireRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchWires = async () => {
      try {
        const res = await fetch('/api/wires');
        const json = await res.json();
        
        if (json.success) {
          // The CFO Portal specifically highlights 'pending' wires first
          const sortedData = json.data.sort((a: WireRequest, b: WireRequest) => {
            if (a.status === 'pending' && b.status !== 'pending') return -1;
            if (a.status !== 'pending' && b.status === 'pending') return 1;
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
    fetchWires();
  }, []);

  const pendingCount = requests.filter(r => r.status === 'pending').length;

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
        <div className="flex items-center gap-4">
          <div className="text-sm font-medium bg-slate-800 border border-slate-700 px-4 py-2 rounded-full">
            Role: CFO
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 sm:p-8 rounded-b-xl shadow-sm border border-t-0 border-slate-200">
        
        <div className="flex justify-between items-end mb-6">
          <h2 className="text-xl font-bold text-slate-900">Wire Authorization Queue</h2>
          {pendingCount > 0 && (
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
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-medium bg-slate-50">No wires have been initiated by your AP department.</td></tr>
              ) : requests.map((req) => (
                <tr key={req.id} className={`hover:bg-slate-50 transition-colors ${req.status === 'pending' ? 'bg-blue-50/30' : ''}`}>
                  <td className="px-6 py-4 font-mono text-xs">
                    <Link href={`/approve/${req.id}`} className={`flex items-center gap-1 font-semibold underline ${req.status === 'pending' ? 'text-blue-600 hover:text-blue-800' : 'text-slate-500 hover:text-slate-700'}`}>
                      {req.status === 'pending' ? 'Review & Sign' : 'View Record'} <ExternalLink size={12} />
                    </Link>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900">{req.vendor_name}</td>
                  <td className="px-6 py-4 text-slate-900 font-semibold">${Number(req.amount).toLocaleString()}</td>
                  <td className="px-6 py-4 text-slate-500 truncate max-w-[150px]">{req.purpose || '-'}</td>
                  <td className="px-6 py-4">
                    {req.status === "approved" && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200"><CheckCircle2 size={14} /> Approved</span>}
                    {req.status === "denied" && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200"><XCircle size={14} /> Declined</span>}
                    {req.status === "pending" && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200"><Clock size={14} /> Pending Auth</span>}
                  </td>
                  <td className="px-6 py-4 text-right text-slate-500">
                    {new Date(req.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
