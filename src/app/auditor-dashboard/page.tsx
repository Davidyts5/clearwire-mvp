"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, Loader2, Lock, FileText, Search, Download, AlertTriangle, CheckCircle, Activity, Eye, FileDigit, Settings, Building2, PlayCircle, Filter } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

export default function AuditorDashboard() {
  const [data, setData] = useState<any>({ stats: null, investigations: [], timeline: [] });
  const [isLoading, setIsLoading] = useState(true);
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("ALL");
  
  // Replay Modal State
  const [selectedSubject, setSelectedSubject] = useState<any>(null);
  const [replayEvents, setReplayEvents] = useState<any[]>([]);

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

  const openReplay = (subject: any) => {
    setSelectedSubject(subject);
    // Extract chronologically ascending events for this specific subject
    const relatedEvents = data.timeline
      .filter((e: any) => e.subjectId === subject.subjectId)
      .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    setReplayEvents(relatedEvents);
  };

  const closeReplay = () => {
    setSelectedSubject(null);
    setReplayEvents([]);
  };

  const exportCSV = () => {
    const headers = ['Timestamp', 'Category', 'Severity', 'Title', 'Actor', 'Role', 'Subject ID', 'Details'];
    const rows = (selectedSubject ? replayEvents : data.timeline).map((e: any) => [
      new Date(e.timestamp).toISOString(),
      e.category,
      e.severity,
      e.title,
      e.actorName,
      e.actorRole,
      e.subjectId,
      `"${(e.message || '').replace(/"/g, '""')}"`
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `ClearWire_Audit_Export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter Timeline
  const filteredTimeline = data.timeline.filter((e: any) => {
    const matchesSearch = (e.title + e.message + e.actorName + e.subjectId).toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === "ALL" || e.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const getSeverityColor = (sev: string) => {
    switch (sev) {
      case 'critical': return 'bg-red-100 text-red-700 border-red-200';
      case 'warning': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'success': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default: return 'bg-blue-50 text-blue-700 border-blue-100';
    }
  };

  if (isLoading) return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 print:p-0 print:m-0 print:w-full print:max-w-none">
      
      {/* Header - Hidden in modal print view, visible in standard view */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2 text-blue-600 mb-2 font-bold uppercase tracking-wider text-xs">
            <ShieldCheck size={16} /> Read-Only Compliance View
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Enterprise Investigation Center</h1>
          <p className="text-slate-500 mt-1">Immutable audit trails, forensic replay, and automated fraud case tracking.</p>
        </div>
        <button onClick={exportCSV} className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-colors">
          <Download size={18} /> Export Full Audit CSV
        </button>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-lg"><AlertTriangle size={24}/></div>
          <div><p className="text-sm font-bold text-slate-500 uppercase">Open Investigations</p><p className="text-2xl font-bold text-slate-900">{data.stats?.totalInvestigations || 0}</p></div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg"><Building2 size={24}/></div>
          <div><p className="text-sm font-bold text-slate-500 uppercase">Restricted Vendors</p><p className="text-2xl font-bold text-slate-900">{data.stats?.restrictedVendors || 0}</p></div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Activity size={24}/></div>
          <div><p className="text-sm font-bold text-slate-500 uppercase">Frozen Wires</p><p className="text-2xl font-bold text-slate-900">{data.stats?.frozenWires || 0}</p></div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-lg"><Settings size={24}/></div>
          <div><p className="text-sm font-bold text-slate-500 uppercase">Policy Changes</p><p className="text-2xl font-bold text-slate-900">{data.stats?.policyChanges || 0}</p></div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8 print:hidden">
        
        {/* Left Column: Active Investigations */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[600px]">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="font-bold text-slate-900 flex items-center gap-2"><AlertTriangle size={18} className="text-red-500"/> Active Investigations</h2>
              <p className="text-xs text-slate-500 mt-1">Frozen wires and restricted vendor cases awaiting final compliance review.</p>
            </div>
            <div className="overflow-y-auto flex-1 p-2 space-y-2 bg-slate-50">
              {data.investigations.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">No active investigations.</div>
              ) : data.investigations.map((inv: any) => (
                <div key={inv.id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:border-blue-300 transition-colors cursor-pointer" onClick={() => openReplay(inv)}>
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${inv.type === 'WIRE' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{inv.type}</span>
                    <span className="text-[10px] font-bold uppercase text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100">{inv.riskScore}/100 RISK</span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">{inv.title}</h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-1">{inv.riskReasons[0]}</p>
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100">
                    <span className="text-xs font-medium text-slate-400">{new Date(inv.date).toLocaleDateString()}</span>
                    <button className="text-xs font-bold text-blue-600 flex items-center gap-1"><PlayCircle size={14}/> Replay</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Global Unified Timeline */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
              <input type="text" placeholder="Search logs by ID, vendor, or user..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="ALL">All Event Types</option>
              <option value="WIRE">Wire Operations</option>
              <option value="VENDOR">Vendor Activity</option>
              <option value="POLICY">Policy Changes</option>
              <option value="SYSTEM">System/Auth</option>
            </select>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
              <FileDigit size={18} className="text-blue-500"/>
              <h2 className="font-bold text-slate-900">Unified Audit Stream</h2>
            </div>
            <div className="overflow-y-auto h-[535px]">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase text-xs sticky top-0 backdrop-blur-md">
                  <tr>
                    <th className="px-6 py-3">Timestamp</th>
                    <th className="px-6 py-3">Event</th>
                    <th className="px-6 py-3">Actor</th>
                    <th className="px-6 py-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTimeline.length === 0 ? <tr><td colSpan={4} className="p-8 text-center text-slate-500">No events found.</td></tr> : 
                   filteredTimeline.map((e: any) => (
                    <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3 whitespace-nowrap text-xs font-medium text-slate-500">{new Date(e.timestamp).toLocaleString()}</td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getSeverityColor(e.severity)}`}>
                          {e.title}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <div className="font-semibold text-slate-900">{e.actorName}</div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider">{e.actorRole}</div>
                      </td>
                      <td className="px-6 py-3">
                        <div className="text-sm text-slate-700 line-clamp-2">{e.message}</div>
                        <div className="text-[10px] font-mono text-slate-400 mt-1">ID: {e.subjectId || 'N/A'}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Investigation Replay Modal */}
      {selectedSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 print:static print:p-0 print:block print:bg-white bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] print:h-auto flex flex-col overflow-hidden animate-in fade-in zoom-in-95 print:shadow-none print:animate-none">
            
            <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white print:bg-white print:text-black print:border-b-2 print:border-black">
              <div>
                <div className="flex items-center gap-2 text-blue-400 print:text-slate-500 font-bold uppercase tracking-wider text-xs mb-1">
                  <ShieldCheck size={16} /> Certified Compliance Evidence
                </div>
                <h2 className="text-2xl font-bold">Investigation: {selectedSubject.title}</h2>
                <p className="text-slate-400 print:text-slate-500 text-sm mt-1 font-mono">Ref: {selectedSubject.subjectId}</p>
              </div>
              <div className="flex items-center gap-3 print:hidden">
                <button onClick={() => window.print()} className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  Print Report
                </button>
                <button onClick={exportCSV} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  Export CSV
                </button>
                <button onClick={closeReplay} className="text-slate-400 hover:text-white ml-2">
                  <span className="sr-only">Close</span>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col md:flex-row print:block">
              {/* Left Panel: Incident Summary */}
              <div className="md:w-1/3 bg-slate-50 border-r border-slate-200 p-6 space-y-6 print:w-full print:border-r-0 print:border-b">
                <div>
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Incident Summary</h3>
                  <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                    <p className="text-xs text-slate-500 uppercase font-bold">Current Status</p>
                    <p className="font-bold text-slate-900 text-lg mb-4">{selectedSubject.status}</p>
                    
                    <p className="text-xs text-slate-500 uppercase font-bold">Assessed Risk Score</p>
                    <div className="flex items-center gap-2 mt-1 mb-4">
                      <div className="w-full bg-slate-200 rounded-full h-2.5">
                        <div className="bg-red-600 h-2.5 rounded-full" style={{ width: `${selectedSubject.riskScore}%` }}></div>
                      </div>
                      <span className="font-bold text-red-600 text-sm">{selectedSubject.riskScore}/100</span>
                    </div>

                    <p className="text-xs text-slate-500 uppercase font-bold mb-2">Detected Anomalies</p>
                    <ul className="space-y-2">
                      {selectedSubject.riskReasons.map((r: string, i: number) => (
                        <li key={i} className="text-xs font-medium text-slate-700 bg-red-50 text-red-800 p-2 rounded border border-red-100 flex items-start gap-2">
                          <AlertTriangle size={14} className="shrink-0 mt-0.5"/> {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl text-blue-900">
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><ShieldCheck size={14}/> Auditor Recommendation</h3>
                  <p className="text-sm font-medium mt-2">
                    Review the chronological replay timeline. Verify all vendor modifications with external sources before lifting any restrictions.
                  </p>
                </div>
              </div>

              {/* Right Panel: Replay Timeline */}
              <div className="md:w-2/3 p-6 sm:p-8 bg-white print:w-full">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-8">Forensic Event Replay</h3>
                
                <div className="relative border-l-2 border-slate-200 ml-4 space-y-8">
                  {replayEvents.length === 0 ? (
                    <p className="text-slate-500 ml-6 text-sm italic">No chronological events found for this subject.</p>
                  ) : replayEvents.map((evt, idx) => (
                    <div key={idx} className="relative pl-8">
                      {/* Timeline Dot */}
                      <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white ${
                        evt.severity === 'critical' ? 'bg-red-500' :
                        evt.severity === 'warning' ? 'bg-amber-500' :
                        evt.severity === 'success' ? 'bg-emerald-500' : 'bg-blue-500'
                      }`}></div>
                      
                      {/* Event Card */}
                      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm relative hover:shadow-md transition-shadow">
                        <div className="absolute top-4 right-4 text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">
                          {new Date(evt.timestamp).toLocaleTimeString()}
                        </div>
                        <h4 className="font-bold text-slate-900 text-lg mb-1">{evt.title}</h4>
                        
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded uppercase flex items-center gap-1">
                            <Eye size={12}/> {evt.actorRole}
                          </span>
                          <span className="text-sm font-medium text-slate-600">{evt.actorName}</span>
                        </div>
                        
                        <div className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
                          {evt.message}
                        </div>

                        {/* WORM Hash Display */}
                        {evt.raw?.new_hash && (
                          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                            <Lock size={12}/> {evt.raw.new_hash}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {/* End of Replay Marker */}
                  <div className="relative pl-8 pt-4">
                    <div className="absolute -left-[9px] top-5 w-4 h-4 rounded-full border-2 border-white bg-slate-300"></div>
                    <div className="text-sm font-bold text-slate-400 uppercase tracking-wider">End of Trace</div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

