"use client";
import { useState, useEffect } from "react";
import { ShieldCheck, Loader2, ArrowLeft, Clock, User, AlertTriangle, Fingerprint, RefreshCcw, PlayCircle } from "lucide-react";
import Link from "next/link";

export default function InvestigationCenter({ params }: { params: { id: string } }) {
  const [wireDetails, setWireDetails] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const [isPlaying, setIsPlaying] = useState(false);
  const [visibleLogs, setVisibleLogs] = useState<any[]>([]);
  
  useEffect(() => {
    const fetchInvestigationData = async () => {
      try {
        const cacheBuster = new Date().getTime();
        const [wireRes, logRes] = await Promise.all([
          fetch(`/api/wires/${params.id}?t=${cacheBuster}`, { cache: 'no-store' }),
          fetch(`/api/audit/timeline/${params.id}?t=${cacheBuster}`, { cache: 'no-store' })
        ]);
        
        const wireJson = await wireRes.json();
        const logJson = await logRes.json();
        
        if (!wireJson.success) throw new Error("Wire request not found");
        setWireDetails(wireJson.data);

        if (logJson.success) {
          setAuditLogs(logJson.data);
          setVisibleLogs(logJson.data); 
        }
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to load investigation data");
      } finally { 
        setIsLoading(false); 
      }
    };
    fetchInvestigationData();
  }, [params.id]);

  const startReplay = () => {
    setIsPlaying(true);
    setVisibleLogs([]);
    
    auditLogs.forEach((log, index) => {
      setTimeout(() => {
        setVisibleLogs(prev => [...prev, log]);
        if (index === auditLogs.length - 1) {
          setTimeout(() => setIsPlaying(false), 1000);
        }
      }, index * 1200); 
    });
  };

  const getEventIcon = (action: string) => {
    if (action.includes('CREATED')) return <User className="text-blue-500" size={20} />;
    if (action.includes('FROZEN') || action.includes('DENIED')) return <AlertTriangle className="text-red-500" size={20} />;
    if (action.includes('APPROVED')) return <Fingerprint className="text-emerald-500" size={20} />;
    if (action.includes('REVIEW')) return <ShieldCheck className="text-amber-500" size={20} />;
    if (action.includes('VENDOR_MASTER')) return <RefreshCcw className="text-purple-500" size={20} />;
    return <Clock className="text-slate-400" size={20} />;
  };

  const formatActionText = (action: string) => {
    return action.replace(/_/g, ' ');
  };

  if (isLoading) return <div className="text-center mt-20 text-slate-500 font-medium animate-pulse">Initializing Investigation Center...</div>;
  if (errorMsg) return <div className="text-center mt-20 text-red-500 font-bold">{errorMsg}</div>;

  let riskReasons: string[] = [];
  try { if (wireDetails.risk_reasons) riskReasons = JSON.parse(wireDetails.risk_reasons); } catch (e) {}

  return (
    <div className="max-w-5xl mx-auto mt-10 px-4 sm:px-6 lg:px-8 space-y-6 pb-20">
      <Link href="/auditor-dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
        <ArrowLeft size={16} /> Back to Dashboard
      </Link>

      <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Activity Replay</h1>
          <p className="text-slate-400 text-sm font-mono mt-1">Transaction ID: {wireDetails.id}</p>
        </div>
        <button 
          onClick={startReplay} 
          disabled={isPlaying}
          className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-all shadow-[0_0_20px_-5px_rgba(147,51,234,0.5)]"
        >
          {isPlaying ? <Loader2 size={18} className="animate-spin" /> : <PlayCircle size={18} />}
          {isPlaying ? "Replaying..." : "Play Timeline"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
            <h2 className="text-lg font-bold text-slate-900 mb-8 border-b border-slate-100 pb-4">Chronological Event Stream</h2>
            
            <div className="relative border-l-2 border-slate-100 ml-3 space-y-8">
              {visibleLogs.map((log, index) => (
                <div key={log.id} className="relative pl-8 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both">
                  <div className="absolute -left-3.5 top-1 w-7 h-7 bg-white rounded-full border border-slate-200 flex items-center justify-center shadow-sm">
                    {getEventIcon(log.action)}
                  </div>
                  
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-slate-900">{formatActionText(log.action)}</span>
                      <span className="text-xs font-mono text-slate-500">{new Date(log.created_at).toLocaleTimeString()}</span>
                    </div>
                    
                    <div className="text-sm text-slate-600 mb-3">
                      Actioned by: <strong>{log.actor?.full_name || 'System'}</strong> 
                      {log.actor?.role && <span className="ml-2 text-xs uppercase bg-slate-200 px-1.5 py-0.5 rounded">{log.actor.role}</span>}
                    </div>

                    {log.action === 'CREATED' && (
                      <div className="bg-white p-3 rounded border border-slate-200 text-xs font-mono text-slate-500 space-y-1">
                        <div>Amount: ${Number(wireDetails.amount).toLocaleString()}</div>
                        <div>Target: {wireDetails.vendor_name_snapshot}</div>
                        <div>Account: {wireDetails.account_number_snapshot || 'N/A'}</div>
                        {wireDetails.risk_score > 0 && (
                          <div className="mt-2 text-red-600 border-t border-slate-100 pt-2">
                            <strong>System Risk Engine Evaluated Score: {wireDetails.risk_score}</strong>
                            <ul className="list-disc pl-4 mt-1">
                              {riskReasons.map((r, i) => <li key={i}>{r}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {log.action.includes('APPROVED') && (
                      <div className="bg-emerald-50 p-3 rounded border border-emerald-200 text-xs font-mono text-emerald-800 break-all">
                        <strong>Cryptographic Hash:</strong><br/>
                        {log.new_hash}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {isPlaying && (
              <div className="mt-8 ml-3 pl-8 text-sm text-slate-400 font-medium flex items-center gap-2 animate-pulse">
                <Loader2 size={14} className="animate-spin" /> Awaiting next event...
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-bold text-slate-900 mb-4">Investigation Context</h3>
            
            <div className="space-y-4">
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase mb-1">Final Status</div>
                <div className="font-medium text-slate-900 uppercase">{wireDetails.status}</div>
              </div>
              
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase mb-1">Risk Severity</div>
                <div className="font-medium">
                  {wireDetails.risk_score >= 90 ? <span className="text-red-600">CRITICAL ({wireDetails.risk_score})</span> : 
                   wireDetails.risk_score >= 50 ? <span className="text-amber-600">HIGH ({wireDetails.risk_score})</span> : 
                   <span className="text-emerald-600">LOW ({wireDetails.risk_score})</span>}
                </div>
              </div>

              <div>
                <div className="text-xs font-bold text-slate-400 uppercase mb-1">Purpose / Invoice</div>
                <div className="text-sm text-slate-700">{wireDetails.purpose}</div>
              </div>
            </div>
          </div>
          
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
             <ShieldCheck size={24} className="text-blue-500 mb-3" />
             <h4 className="font-bold text-slate-900 text-sm mb-2">SOC 2 Compliance Verified</h4>
             <p className="text-xs text-slate-500 leading-relaxed">
               All events shown in this timeline are pulled from an immutable WORM database table. Cryptographic hashes tie human identities to physical hardware signatures.
             </p>
          </div>
        </div>

      </div>
    </div>
  );
}
