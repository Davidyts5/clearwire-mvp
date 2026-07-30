"use client";
import { useState, useEffect, useMemo } from "react";
import { Loader2, FileDigit, Search, Download } from "lucide-react";

export default function LedgerPage() {
  const [timeline, setTimeline] = useState<any[]>([]);
  const [timelineSearch, setTimelineSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAuditData = async () => {
      try {
        const cacheBuster = new Date().getTime();
        const res = await fetch(`/api/audit/master?t=${cacheBuster}`, { cache: 'no-store' });
        const json = await res.json();
        if (json.success) {
          setTimeline(json.timeline || []);
        }
      } catch (err) {} finally { setIsLoading(false); }
    };
    fetchAuditData();
  }, []);

  const filteredTimeline = useMemo(() => {
    if (!timelineSearch.trim()) return timeline;
    const lower = timelineSearch.toLowerCase();
    return timeline.filter((e: any) => 
      (e.title || '').toLowerCase().includes(lower) ||
      (e.message || '').toLowerCase().includes(lower) ||
      (e.actorName || '').toLowerCase().includes(lower)
    );
  }, [timeline, timelineSearch]);

  if (isLoading) return <div className="flex justify-center items-center h-full pt-20"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-600 mb-2 font-bold uppercase tracking-wider text-xs">
            <FileDigit size={16} /> Auditor Dashboard
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Master Ledger</h1>
          <p className="text-slate-500 mt-1">Live, chronological record of all immutable workspace events.</p>
        </div>
        <a href="/api/audit/export-csv" className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-colors">
          <Download size={18} /> Export CSV
        </a>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[75vh]">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <FileDigit size={18} className="text-blue-500"/>
            <h2 className="font-bold text-slate-900">Live Immutable Audit Stream</h2>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2 text-slate-400" size={16} />
            <input type="text" placeholder="Search timeline..." value={timelineSearch} onChange={e => setTimelineSearch(e.target.value)} className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
        </div>
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-sm text-left">
            <thead className="bg-white border-b border-slate-100 text-slate-500 font-bold uppercase text-xs sticky top-0 shadow-sm">
              <tr><th className="px-6 py-3">Timestamp</th><th className="px-6 py-3">Event</th><th className="px-6 py-3">Actor</th><th className="px-6 py-3">Details</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTimeline.length === 0 ? <tr><td colSpan={4} className="p-8 text-center text-slate-500">No events match search.</td></tr> : 
               filteredTimeline.map((e: any) => (
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
  );
}