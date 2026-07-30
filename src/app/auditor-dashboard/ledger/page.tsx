"use client";
import { useState, useEffect, useMemo } from "react";
import { Loader2, FileDigit, Search, Download, ShieldCheck, ShieldAlert, FileText, ChevronRight, CornerDownRight, Settings, Building2, ListTodo, User } from "lucide-react";

export default function LedgerPage() {
  const [timeline, setTimeline] = useState<any[]>([]);
  const [timelineSearch, setTimelineSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'WIRE' | 'VENDOR' | 'SYSTEM' | 'USER'>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  
  // Slide-out Drawer State
  const [selectedSubject, setSelectedSubject] = useState<{ id: string, type: 'WIRE' | 'VENDOR' | 'SYSTEM' | 'USER' } | null>(null);
  const [drawerData, setDrawerData] = useState<any[]>([]);
  const [isDrawerLoading, setIsDrawerLoading] = useState(false);
  const [integrityResults, setIntegrityResults] = useState<Record<string, boolean>>({});
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    const fetchAuditData = async () => {
      try {
        const cacheBuster = new Date().getTime();
        // Use the proper timeline API endpoint to get all raw audit logs
        const res = await fetch(`/api/audit/timeline?limit=300&t=${cacheBuster}`, { cache: 'no-store' });
        const json = await res.json();
        if (json.success) {
          setTimeline(json.data || []);
        }
      } catch (err) {} finally { setIsLoading(false); }
    };
    fetchAuditData();
  }, []);

  const filteredTimeline = useMemo(() => {
    if (!timelineSearch.trim()) return timeline;
    const lower = timelineSearch.toLowerCase();
    return timeline.filter((e: any) => 
      (e.action || '').toLowerCase().includes(lower) ||
      (e.actor?.full_name || '').toLowerCase().includes(lower) ||
      (e.wire_id || '').toLowerCase().includes(lower) ||
      JSON.stringify(e.event_payload || {}).toLowerCase().includes(lower)
    );
  }, [timeline, timelineSearch]);

  const groupedTimeline = useMemo(() => {
    const grouped: any[] = [];
    let currentGroup: any = null;

    filteredTimeline.forEach((log) => {
      // Determine Subject Type and ID based on action and payloads
      let subjectType = 'SYSTEM';
      let subjectId = 'GLOBAL';
      let title = 'System Policy Change';

      if (log.action.includes('WIRE') || log.action === 'CREATED' || log.action.includes('STATE_CHANGED')) {
        subjectType = 'WIRE';
        subjectId = log.wire_id || 'UNKNOWN';
        title = `Wire Transfer: ${subjectId.substring(0, 8)}...`;
      } else if (log.action.includes('VENDOR')) {
        subjectType = 'VENDOR';
        subjectId = log.event_payload?.vendor_id || log.event_payload?.request_id || log.wire_id || 'UNKNOWN';
        title = `Vendor Profile: ${subjectId.substring(0, 8)}...`;
      } else if (log.action.includes('INVITATION') || log.action.includes('DEVICE')) {
        subjectType = 'USER';
        subjectId = log.event_payload?.email || log.event_payload?.device_name || log.event_payload?.device_id || 'UNKNOWN';
        title = `User Action: ${subjectId}`;
      }

      if (!currentGroup || currentGroup.subjectId !== subjectId) {
        if (currentGroup) grouped.push(currentGroup);
        currentGroup = {
          subjectId,
          subjectType,
          title,
          latestDate: log.created_at,
          logs: [log]
        };
      } else {
        currentGroup.logs.push(log);
      }
    });

    if (currentGroup) grouped.push(currentGroup);
    
    // Apply Category Filter
    if (activeCategory === 'ALL') return grouped;
    return grouped.filter(g => g.subjectType === activeCategory);
  }, [filteredTimeline, activeCategory]);

  const openDrawer = async (subjectId: string, type: 'WIRE' | 'VENDOR' | 'SYSTEM' | 'USER') => {
    setSelectedSubject({ id: subjectId, type });
    setIsDrawerLoading(true);
    setIntegrityResults({});
    try {
      // If it's a wire, we can fetch the exact forensic timeline using the specific endpoint
      if (type === 'WIRE' && subjectId !== 'UNKNOWN') {
        const res = await fetch(`/api/audit/timeline/${subjectId}`);
        const json = await res.json();
        if (json.success) {
           // We reverse to show chronological top-to-bottom in drawer
           setDrawerData(json.data.slice().reverse());
        }
      } else {
        // Fallback for non-wires: just filter the already-loaded global timeline
        const filtered = timeline.filter(l => 
          l.wire_id === subjectId || 
          l.event_payload?.vendor_id === subjectId || 
          l.event_payload?.request_id === subjectId ||
          l.event_payload?.email === subjectId ||
          l.event_payload?.device_name === subjectId ||
          l.event_payload?.device_id === subjectId
        );
        // Reverse them so they read chronologically top-to-bottom in the drawer
        setDrawerData(filtered.slice().reverse());
      }
    } catch (e) {} finally {
      setIsDrawerLoading(false);
    }
  };

  const runIntegrityAudit = async () => {
    if (selectedSubject?.type !== 'WIRE' || selectedSubject.id === 'UNKNOWN') return;
    setIsVerifying(true);
    try {
      const res = await fetch(`/api/audit/timeline/${selectedSubject.id}/verify`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setIntegrityResults(json.data);
      }
    } catch (e) {} finally {
      setIsVerifying(false);
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes('APPROVED') || action === 'CREATED') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (action.includes('REJECTED') || action.includes('DENIED') || action.includes('FROZEN') || action.includes('RESTRICTED')) return 'bg-red-100 text-red-700 border-red-200';
    if (action.includes('ESCALATED') || action.includes('REQUESTED') || action.includes('CHANGED') || action.includes('REVOKED')) return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  if (isLoading) return <div className="flex justify-center items-center h-full pt-20"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-20 relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-600 mb-2 font-bold uppercase tracking-wider text-xs">
            <FileDigit size={16} /> Auditor Dashboard
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Master Ledger</h1>
          <p className="text-slate-500 mt-1">Categorized chronological record of all immutable workspace events.</p>
        </div>
        <a href="/api/audit/export-csv" className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-colors">
          <Download size={18} /> Export Full CSV
        </a>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[75vh]">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 flex-wrap gap-3">
          
          {/* Tab Switcher */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-lg shadow-sm overflow-x-auto max-w-full">
             <button onClick={() => setActiveCategory('ALL')} className={`px-3 py-1.5 rounded-md text-xs font-bold whitespace-nowrap transition-colors ${activeCategory === 'ALL' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}>
               All Events
             </button>
             <button onClick={() => setActiveCategory('WIRE')} className={`px-3 py-1.5 rounded-md text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-colors ${activeCategory === 'WIRE' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}>
               <ListTodo size={14}/> Wires
             </button>
             <button onClick={() => setActiveCategory('VENDOR')} className={`px-3 py-1.5 rounded-md text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-colors ${activeCategory === 'VENDOR' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}>
               <Building2 size={14}/> Vendors
             </button>
             <button onClick={() => setActiveCategory('SYSTEM')} className={`px-3 py-1.5 rounded-md text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-colors ${activeCategory === 'SYSTEM' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}>
               <Settings size={14}/> Policies
             </button>
             <button onClick={() => setActiveCategory('USER')} className={`px-3 py-1.5 rounded-md text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-colors ${activeCategory === 'USER' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}>
               <User size={14}/> Users
             </button>
          </div>

          <div className="relative w-full sm:w-64 ml-auto">
            <Search className="absolute left-3 top-2 text-slate-400" size={16} />
            <input type="text" placeholder="Search payload, action, or ID..." value={timelineSearch} onChange={e => setTimelineSearch(e.target.value)} className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
        </div>
        
        <div className="overflow-y-auto flex-1 bg-slate-50 p-4 space-y-4">
          {groupedTimeline.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No events match filter.</div>
          ) : (
            groupedTimeline.map((group: any, idx: number) => (
              <div key={idx} onClick={() => openDrawer(group.subjectId, group.subjectType)} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm cursor-pointer hover:border-blue-400 hover:shadow-md transition-all group">
                <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-bold text-slate-900 flex items-center gap-2 group-hover:text-blue-600 transition-colors">
                      {group.title} <ChevronRight size={16} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
                    </h3>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1 font-mono">Last Activity: {new Date(group.latestDate).toLocaleString()}</p>
                  </div>
                  <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded border border-slate-200">{group.logs.length} Actions</span>
                </div>
                
                <div className="space-y-3 pl-2 border-l-2 border-slate-100">
                  {group.logs.slice(0, 3).map((log: any) => (
                    <div key={log.id} className="relative pl-4">
                      <div className="absolute w-2 h-2 rounded-full bg-slate-300 -left-[5px] top-1.5"></div>
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${getActionColor(log.action)}`}>
                            {log.action.replace(/_/g, ' ')}
                          </span>
                          <span className="text-[10px] text-slate-500 ml-2">by {log.actor?.full_name || 'System'}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono hidden sm:block truncate w-32">{log.new_hash}</div>
                      </div>
                    </div>
                  ))}
                  {group.logs.length > 3 && (
                    <div className="pl-4 text-xs font-medium text-blue-600 flex items-center gap-1">
                      <CornerDownRight size={12} /> + {group.logs.length - 3} more actions in trace
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Forensic Drawer */}
      {selectedSubject && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setSelectedSubject(null)}></div>
          <div className="relative w-full max-w-xl bg-slate-50 h-full border-l border-slate-200 shadow-2xl flex flex-col animate-in slide-in-from-right">
            <div className="p-6 border-b border-slate-200 bg-white flex justify-between items-center shrink-0">
              <div>
                <div className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Lifecycle Trace</div>
                <h2 className="text-xl font-bold text-slate-900 font-mono truncate w-72 sm:w-96">{selectedSubject.id}</h2>
              </div>
              <button onClick={() => setSelectedSubject(null)} className="p-2 text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors">
                <ChevronRight size={20} />
              </button>
            </div>

            {selectedSubject.type === 'WIRE' && drawerData.length > 0 && selectedSubject.id !== 'UNKNOWN' && (
              <div className="p-4 border-b border-slate-200 bg-white flex justify-between items-center shrink-0">
                <p className="text-xs text-slate-500 font-medium">Verify cryptographic integrity across all actions in this trace.</p>
                <button onClick={runIntegrityAudit} disabled={isVerifying} className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm flex items-center gap-2 transition-colors shrink-0">
                  {isVerifying ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14}/>}
                  Run Integrity Audit
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
              {isDrawerLoading ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" size={32} /></div>
              ) : drawerData.length === 0 ? (
                <div className="flex justify-center py-20 text-slate-500 text-sm">No historical data available.</div>
              ) : (
                <div className="space-y-6">
                  {drawerData.map((log: any) => {
                    const isVerified = integrityResults[log.id];
                    const hasRunVerification = Object.keys(integrityResults).length > 0;
                    
                    return (
                      <div key={log.id} className="relative pl-6 border-l-2 border-slate-200 last:border-transparent pb-2">
                        <div className="absolute w-3 h-3 bg-blue-500 rounded-full -left-[7px] top-1 border-2 border-slate-50"></div>
                        
                        <div className="mb-2">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getActionColor(log.action)}`}>
                            {log.action.replace(/_/g, ' ')}
                          </span>
                        </div>
                        
                        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm text-sm">
                          <div className="flex justify-between items-start mb-3 border-b border-slate-100 pb-2">
                            <span className="font-bold text-slate-900">Actor: {log.actor?.full_name || 'System'} <span className="font-normal text-slate-500 text-xs">({log.actor?.role || 'SYSTEM'})</span></span>
                            <span className="text-[10px] text-slate-400">{new Date(log.created_at).toLocaleString()}</span>
                          </div>
                          
                          <div className="space-y-2 font-mono text-[10px] bg-slate-50 p-3 rounded border border-slate-100 overflow-x-auto">
                            <div className="text-slate-500"><span className="text-slate-400">PREV_HASH:</span> {log.previous_hash || 'GENESIS'}</div>
                            <div className="text-slate-800 font-bold"><span className="text-slate-400 font-normal">NEW_HASH:</span> {log.new_hash}</div>
                          </div>
                          
                          {log.event_payload && (
                            <div className="mt-3 text-xs text-slate-600 bg-blue-50/50 p-3 rounded border border-blue-100">
                              <span className="block text-[10px] font-bold text-blue-800 uppercase mb-1">Decoded Payload</span>
                              <pre className="whitespace-pre-wrap font-sans">{JSON.stringify(log.event_payload, null, 2)}</pre>
                            </div>
                          )}

                          {hasRunVerification && (
                            <div className={`mt-3 pt-3 border-t ${isVerified ? 'border-emerald-200 text-emerald-700' : 'border-red-200 text-red-700'} font-sans font-bold flex items-center gap-1.5 text-xs`}>
                              {isVerified ? <><ShieldCheck size={16}/> HASH CHAIN VERIFIED</> : <><ShieldAlert size={16}/> INTEGRITY VERIFICATION FAILED</>}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}