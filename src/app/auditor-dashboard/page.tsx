"use client";
import { useState, useEffect } from "react";
import { ShieldCheck, Loader2, ExternalLink, Search, Filter, PlayCircle, Download } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function AuditorDashboard() {
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

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

  const filteredRequests = requests.filter(req => 
    req.vendor_name_snapshot.toLowerCase().includes(searchQuery.toLowerCase()) ||
    req.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    req.status.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto mt-10 px-4 sm:px-6 lg:px-8 space-y-6">
      <div className="bg-slate-900 text-white p-6 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <ShieldCheck size={32} className="text-emerald-400" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Compliance & Investigation Center</h1>
            <p className="text-slate-400 text-sm">Forensic audit logs, timelines, and SOC 2 evidence</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-700 px-4 py-2 rounded-lg text-sm font-medium">
            <Download size={16} className="text-slate-300" /> Export CSV
          </button>
          <div className="text-sm font-medium bg-emerald-900/50 text-emerald-200 border border-emerald-800/50 px-4 py-2 rounded-lg uppercase">
            Role: AUDITOR (Read Only)
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 sm:p-8 rounded-xl shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <h2 className="text-xl font-bold text-slate-900">Enterprise Audit Log</h2>
          
          <div className="flex w-full md:w-auto items-center gap-3">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search Vendor, ID, or Status..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <button className="bg-slate-100 p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-200">
              <Filter size={18} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
              <tr>
                <th className="px-6 py-4">Forensic Timeline</th>
                <th className="px-6 py-4">Evidence</th>
                <th className="px-6 py-4">Target Vendor</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Risk Level</th>
                <th className="px-6 py-4">Final Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? <tr><td colSpan={6} className="px-6 py-12 text-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto" /></td></tr> : 
               filteredRequests.length === 0 ? <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-medium bg-slate-50">No records found.</td></tr> : 
               filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      {/* The Activity Replay Button */}
                      <Link href={`/auditor-dashboard/investigations/${req.id}`} className="flex items-center gap-1.5 font-semibold text-purple-600 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded border border-purple-100 transition-colors w-max">
                        <PlayCircle size={14} /> Activity Replay
                      </Link>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">
                      <a href={`/api/pdf/${req.id}`} target="_blank" className="flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-800 underline">View PDF <ExternalLink size={12} /></a>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">{req.vendor_name_snapshot}</td>
                    <td className="px-6 py-4 text-slate-900 font-semibold">${Number(req.amount).toLocaleString()}</td>
                    <td className="px-6 py-4">
                      {req.risk_score >= 90 ? <span className="text-red-600 font-bold">{req.risk_score} (CRITICAL)</span> : 
                       req.risk_score >= 50 ? <span className="text-amber-600 font-semibold">{req.risk_score} (HIGH)</span> : 
                       <span className="text-emerald-600">{req.risk_score} (LOW)</span>}
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-medium uppercase tracking-wider">{req.status}</span>
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
