"use client";
import { useState, useEffect, useMemo } from "react";
import { ShieldCheck, Loader2, AlertTriangle, Activity, Settings, PlayCircle, Briefcase } from "lucide-react";
import Link from "next/link";
import DataFilters, { FilterConfig } from "@/components/DataFilters";

export default function AuditorDashboard() {
  const [data, setData] = useState<any>({ stats: null, investigations: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [filteredInvestigations, setFilteredInvestigations] = useState<any[]>([]);

  useEffect(() => {
    const fetchAuditData = async () => {
      try {
        const cacheBuster = new Date().getTime();
        const res = await fetch(`/api/audit/master?t=${cacheBuster}`, { cache: 'no-store' });
        const json = await res.json();
        if (json.success) {
          setData(json);
          setFilteredInvestigations(json.investigations || []);
        }
      } catch (err) {} finally { setIsLoading(false); }
    };
    fetchAuditData();
  }, []);

  const avgResolutionHours = useMemo(() => {
    if (!data.investigations) return 'N/A';
    const resolved = data.investigations.filter((i: any) => i.status === 'resolved' && i.resolved_at && i.date);
    if (resolved.length === 0) return 'N/A';
    
    const totalMs = resolved.reduce((acc: number, curr: any) => {
      return acc + (new Date(curr.resolved_at).getTime() - new Date(curr.date).getTime());
    }, 0);
    const avgMs = totalMs / resolved.length;
    const hours = avgMs / (1000 * 60 * 60);
    return hours < 24 ? `${hours.toFixed(1)} hrs` : `${(hours / 24).toFixed(1)} days`;
  }, [data.investigations]);

  const filterConfig: FilterConfig = {
    searchPlaceholder: "Search cases by title or ID...",
    searchKeys: ['title', 'case_number'],
    statuses: [
      { label: 'Open', value: 'open' },
      { label: 'Under Review', value: 'under_review' },
      { label: 'Escalated', value: 'escalated' },
      { label: 'Resolved', value: 'resolved' }
    ],
    sortOptions: [
      { label: 'Newest First', value: 'newest' },
      { label: 'Oldest First', value: 'oldest' },
      { label: 'Highest Risk', value: 'highest_risk' }
    ]
  };

  const getAgeBorderClass = (inv: any) => {
    if (inv.status === 'resolved') return 'border-l-4 border-l-transparent';
    const ageHours = (Date.now() - new Date(inv.date).getTime()) / (1000 * 60 * 60);
    if (ageHours > 72) return 'border-l-4 border-l-red-500';
    if (ageHours > 24) return 'border-l-4 border-l-amber-500';
    return 'border-l-4 border-l-transparent';
  };

  if (isLoading) return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-600 mb-2 font-bold uppercase tracking-wider text-xs">
            <ShieldCheck size={16} /> Auditor Dashboard
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Active Cases</h1>
          <p className="text-slate-500 mt-1">Manage fraud cases and automated risk workflows.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Activity size={24}/></div>
          <div><p className="text-sm font-bold text-slate-500 uppercase">Avg. Resolution</p><p className="text-2xl font-bold text-slate-900">{avgResolutionHours}</p></div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <h2 className="font-bold text-slate-900 flex items-center gap-2"><Briefcase size={18} className="text-slate-600"/> Case Queue</h2>
        </div>
        
        <div className="p-4 border-b border-slate-100 bg-white">
          <DataFilters data={data.investigations} config={filterConfig} onFilterChange={setFilteredInvestigations} />
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-3 bg-slate-50">
          {filteredInvestigations.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">No cases match filters.</div>
          ) : filteredInvestigations.map((inv: any) => (
            <Link href={`/auditor-dashboard/investigations/${inv.id}`} key={inv.id} className={`block bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:border-blue-400 transition-colors ${getAgeBorderClass(inv)}`}>
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
  );
}