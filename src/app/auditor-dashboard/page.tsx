"use client";
import { useState, useEffect, useMemo } from "react";
import { ShieldCheck, Loader2, AlertTriangle, Activity, FileDigit, Settings, PlayCircle, Briefcase, Download, Search, BarChart3, TrendingUp, Users } from "lucide-react";
import Link from "next/link";
import DataFilters, { FilterConfig } from "@/components/DataFilters";

export default function AuditorDashboard() {
  const [data, setData] = useState<any>({ stats: null, investigations: [], timeline: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [filteredInvestigations, setFilteredInvestigations] = useState<any[]>([]);
  const [timelineSearch, setTimelineSearch] = useState("");
  const [activeTab, setActiveTab] = useState<'cases'|'analytics'>('cases');

  // Analytics states
  const [trendData, setTrendData] = useState<any[]>([]);
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const [approverData, setApproverData] = useState<any[]>([]);

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

  useEffect(() => {
    if (activeTab === 'analytics') {
      fetch('/api/audit/analytics/risk-trend').then(r=>r.json()).then(j => setTrendData(j.data || []));
      fetch('/api/audit/analytics/vendor-leaderboard').then(r=>r.json()).then(j => setLeaderboardData(j.data || []));
      fetch('/api/audit/analytics/approver-behavior').then(r=>r.json()).then(j => setApproverData(j.data || []));
    }
  }, [activeTab]);

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

  const filteredTimeline = useMemo(() => {
    if (!timelineSearch.trim()) return data.timeline || [];
    const lower = timelineSearch.toLowerCase();
    return (data.timeline || []).filter((e: any) => 
      (e.title || '').toLowerCase().includes(lower) ||
      (e.message || '').toLowerCase().includes(lower) ||
      (e.actorName || '').toLowerCase().includes(lower)
    );
  }, [data.timeline, timelineSearch]);

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
            <ShieldCheck size={16} /> Read-Only Compliance View
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Enterprise Investigation Center</h1>
          <p className="text-slate-500 mt-1">Manage fraud cases, forensic replay, and automated risk workflows.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-slate-100 p-1 rounded-lg flex text-sm font-medium border border-slate-200 shadow-sm">
            <button 
              onClick={() => setActiveTab('cases')} 
              className={`px-4 py-1.5 rounded-md transition-colors ${activeTab === 'cases' ? 'bg-white shadow-sm text-slate-900 border border-slate-200' : 'text-slate-500 hover:text-slate-700 border border-transparent'}`}
            >
              Cases
            </button>
            <button 
              onClick={() => setActiveTab('analytics')} 
              className={`px-4 py-1.5 rounded-md transition-colors flex items-center gap-1 ${activeTab === 'analytics' ? 'bg-white shadow-sm text-slate-900 border border-slate-200' : 'text-slate-500 hover:text-slate-700 border border-transparent'}`}
            >
               <BarChart3 size={16}/> Analytics
            </button>
          </div>
          <a href="/api/audit/export-csv" className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-colors">
            <Download size={18} /> Export CSV
          </a>
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

      {activeTab === 'cases' && (
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column: Database-Backed Cases */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[700px]">
              <div className="p-4 border-b border-slate-100 bg-slate-50">
                <h2 className="font-bold text-slate-900 flex items-center gap-2"><Briefcase size={18} className="text-slate-600"/> Case Management</h2>
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

          {/* Right Column: Global Unified Timeline */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-[700px] flex flex-col">
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
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-6 border-b border-slate-100 pb-3">
              <TrendingUp className="text-blue-500" size={20} /> Risk Trend (Last 30 Days)
            </h2>
            {trendData.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-10">No wire requests found for the selected period.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                      <th className="p-3 border-b border-slate-200">Date Bucket</th>
                      <th className="p-3 border-b border-slate-200">Wire Volume</th>
                      <th className="p-3 border-b border-slate-200">Avg Risk</th>
                      <th className="p-3 border-b border-slate-200">Max Risk</th>
                      <th className="p-3 border-b border-slate-200">Top Drivers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trendData.map((d, i) => (
                      <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                        <td className="p-3 font-medium text-slate-900 whitespace-nowrap">{new Date(d.bucket).toLocaleDateString()}</td>
                        <td className="p-3 text-slate-700">{d.wire_count}</td>
                        <td className="p-3 text-slate-700">{d.avg_risk_score}</td>
                        <td className="p-3 text-red-600 font-bold">{d.max_risk_score}</td>
                        <td className="p-3 text-slate-600 text-xs">
                          {Object.entries(d.reasons_breakdown || {}).sort((a: any, b: any) => b[1] - a[1]).slice(0, 3).map((r, i) => (
                            <span key={i} className="inline-block bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[10px] mr-1 mb-1">{r[0]}: {r[1] as number}</span>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-6 border-b border-slate-100 pb-3">
                <AlertTriangle className="text-red-500" size={20} /> Vendor Risk Leaderboard
              </h2>
              {leaderboardData.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-10">No vendors found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                        <th className="p-3 border-b border-slate-200">Vendor</th>
                        <th className="p-3 border-b border-slate-200">Wires</th>
                        <th className="p-3 border-b border-slate-200">Avg Risk</th>
                        <th className="p-3 border-b border-slate-200">Bank Flags</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {leaderboardData.slice(0, 10).map((v, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="p-3 font-semibold text-slate-900">{v.vendor_name}</td>
                          <td className="p-3 text-slate-700">{v.total_wires}</td>
                          <td className="p-3 text-slate-700">{v.avg_risk_score}</td>
                          <td className="p-3 text-red-600 font-bold">{v.flag_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-6 border-b border-slate-100 pb-3">
                <Users className="text-purple-500" size={20} /> Approver Behavior Patterns
              </h2>
              {approverData.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-10">No approval history found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                        <th className="p-3 border-b border-slate-200">Approver</th>
                        <th className="p-3 border-b border-slate-200">Avg Time (Routine)</th>
                        <th className="p-3 border-b border-slate-200">Avg Time (FROZEN)</th>
                        <th className="p-3 border-b border-slate-200">Approve Ratio</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {approverData.map((a, i) => {
                        const routineTime = a.avg_time_routine_ms ? `${(a.avg_time_routine_ms / 60000).toFixed(1)} min` : '-';
                        const frozenTime = a.avg_time_frozen_ms ? `${(a.avg_time_frozen_ms / 60000).toFixed(1)} min` : '-';
                        const ratio = a.approve_ratio !== null ? `${(a.approve_ratio * 100).toFixed(1)}%` : '< 10 acts';
                        return (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="p-3 font-semibold text-slate-900">{a.full_name} <span className="text-[10px] text-slate-500 font-normal uppercase ml-1 block">{a.role}</span></td>
                            <td className="p-3 text-slate-700">{routineTime}</td>
                            <td className="p-3 text-amber-700 font-bold">{frozenTime}</td>
                            <td className="p-3 text-slate-700">{ratio}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
