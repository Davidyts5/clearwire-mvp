"use client";
import { useState, useEffect } from "react";
import { ArrowLeft, Loader2, AlertTriangle, FileText, CheckCircle, Save, MessageSquare, Download, Activity, ShieldCheck, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

export default function CaseDetails({ params }: { params: { id: string } }) {
  const [inv, setInv] = useState<any>(null);
  const [auditors, setAuditors] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [note, setNote] = useState("");
  const [resolution, setResolution] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [docUrl, setDocUrl] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResults, setVerifyResults] = useState<Record<string, boolean>>({});

  const fetchCase = async () => {
    try {
      const res = await fetch(`/api/audit/investigations/${params.id}`);
      const json = await res.json();
      if (json.success) {
        setInv(json.data);
        setAuditors(json.auditors || []);
        if (json.data.wire_requests?.invoice_path) {
          const supabase = createClient();
          const { data } = await supabase.storage.from('invoices').createSignedUrl(json.data.wire_requests.invoice_path, 3600);
          if (data) setDocUrl(data.signedUrl);
        }

        if (json.data.wire_id) {
          const timeRes = await fetch(`/api/audit/timeline/${json.data.wire_id}`);
          const timeJson = await timeRes.json();
          if (timeJson.success) {
            setTimeline(timeJson.data);
          }
        }
      }
    } catch (err) {} finally { setIsLoading(false); }
  };

  useEffect(() => { fetchCase(); }, [params.id]);

  const addNote = async (e: any) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await fetch(`/api/audit/investigations/${params.id}/notes`, { method: 'POST', body: JSON.stringify({ note }) });
      setNote("");
      fetchCase();
    } finally { setIsSubmitting(false); }
  };

  const resolveCase = async (e: any) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await fetch(`/api/audit/investigations/${params.id}`, { method: 'PUT', body: JSON.stringify({ status: 'resolved', resolution_notes: resolution }) });
      fetchCase();
    } finally { setIsSubmitting(false); }
  };

  const handleAssign = async (e: any) => {
    const newAssignee = e.target.value;
    setIsSubmitting(true);
    try {
      await fetch(`/api/audit/investigations/${params.id}`, { method: 'PUT', body: JSON.stringify({ assigned_to: newAssignee }) });
      fetchCase();
    } finally { setIsSubmitting(false); }
  };

  const verifyIntegrity = async () => {
    if (!inv?.wire_id) return;
    setIsVerifying(true);
    try {
      const res = await fetch(`/api/audit/timeline/${inv.wire_id}/verify`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setVerifyResults(json.data);
      }
    } catch(err) {} finally { setIsVerifying(false); }
  };

  if (isLoading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-blue-600" size={32} /></div>;
  if (!inv) return <div className="p-20 text-center text-red-500">Case Not Found</div>;

  return (
    <div className="max-w-6xl mx-auto mt-10 px-4 space-y-6 pb-20">
      <div className="flex justify-between items-center mb-6">
        <Link href="/auditor-dashboard" className="text-slate-500 hover:text-slate-800 flex items-center gap-1 text-sm font-medium">
          <ArrowLeft size={16} /> Back to Case Management
        </Link>
        <a href={`/api/audit/investigations/${params.id}/export`} className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm transition-colors">
          <Download size={16} /> Export as PDF
        </a>
      </div>

      <div className="bg-slate-900 text-white p-6 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-lg">
        <div>
          <div className="text-blue-400 text-sm font-mono font-bold mb-1">{inv.case_number}</div>
          <h1 className="text-2xl font-bold tracking-tight">Compliance Investigation</h1>
        </div>
        <div className="flex items-center gap-4">
          <select value={inv.assigned_to || ""} onChange={handleAssign} disabled={isSubmitting || inv.status === 'resolved'} className="bg-slate-800 border border-slate-700 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500">
            <option value="" disabled>Assign Case...</option>
            {auditors.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
          </select>
          <span className={`px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider ${inv.status === 'resolved' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
            Status: {inv.status.replace('_', ' ')}
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Col: Case Facts & Notes */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Case Facts</h2>
            
            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase">Vendor</p>
                <p className="font-semibold text-slate-900">{inv.vendors?.name || inv.wire_requests?.vendor_name_snapshot}</p>
              </div>
              
              <div className="flex gap-8 border-t border-slate-100 pt-4">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase">Priority</p>
                  <p className={`font-bold capitalize ${inv.priority === 'critical' ? 'text-red-600' : 'text-amber-600'}`}>{inv.priority}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase">Risk Score</p>
                  <p className="font-bold text-red-600">{inv.risk_score}/100</p>
                </div>
              </div>

              {inv.wire_requests && (
                <>
                  <div className="border-t border-slate-100 pt-4">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-2">Wire Attempt</p>
                    <div className="bg-slate-50 p-3 rounded border border-slate-200 font-mono text-sm">
                      Amount: ${inv.wire_requests.amount}<br/>
                      Status: {inv.wire_requests.status}
                    </div>
                    {docUrl && (
                      <a href={docUrl} target="_blank" className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-800">
                        <FileText size={16}/> View Attached Invoice
                      </a>
                    )}
                  </div>
                  {inv.wire_requests.risk_reasons && (
                    <div className="border-t border-slate-100 pt-4">
                      <p className="text-xs font-bold text-slate-500 uppercase mb-2">Risk Breakdown</p>
                      <ul className="list-disc pl-4 text-xs text-slate-700 space-y-1">
                        {JSON.parse(inv.wire_requests.risk_reasons).map((r: any, i: number) => (
                          <li key={i}>{typeof r === 'string' ? r : r.detail}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Investigation Notes Feed */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[350px]">
            <div className="p-4 border-b border-slate-100 bg-slate-50"><h3 className="font-bold text-slate-900 flex items-center gap-2"><MessageSquare size={16}/> Audit Log Notes</h3></div>
            <div className="p-4 flex-1 overflow-y-auto space-y-4 bg-slate-50/50">
              {inv.investigation_notes?.length === 0 ? (
                <p className="text-center text-sm text-slate-500 mt-10">No notes recorded yet.</p>
              ) : inv.investigation_notes?.map((n:any) => (
                <div key={n.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-xs text-slate-700">{n.users?.full_name} ({n.users?.role})</span>
                    <span className="text-[10px] text-slate-400">{new Date(n.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-slate-800">{n.note}</p>
                </div>
              ))}
            </div>
            {inv.status !== 'resolved' && (
              <form onSubmit={addNote} className="p-4 border-t border-slate-200 bg-slate-50 flex gap-2">
                <input required value={note} onChange={e=>setNote(e.target.value)} placeholder="Type a forensic note..." className="flex-1 border border-slate-200 p-2 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                <button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white px-4 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50">Add</button>
              </form>
            )}
          </div>
        </div>

        {/* Right Col: Timeline & Resolution */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
             <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
               <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Activity size={20} className="text-blue-500"/> Forensic Evidence Chain</h2>
               {timeline.length > 0 && (
                 <button onClick={verifyIntegrity} disabled={isVerifying} className="text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-2 transition-colors">
                   {isVerifying ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14}/>}
                   Verify Integrity
                 </button>
               )}
             </div>

             {timeline.length === 0 ? (
               <p className="text-slate-500 text-sm text-center py-10">No chain evidence available for this case.</p>
             ) : (
               <div className="space-y-6">
                 {timeline.map((log: any, idx: number) => {
                   const isVerified = verifyResults[log.id];
                   return (
                     <div key={log.id} className="relative pl-6 border-l-2 border-slate-200 last:border-transparent">
                       <div className="absolute w-3 h-3 bg-blue-500 rounded-full -left-[7px] top-1 border-2 border-white"></div>
                       <div className="mb-1 flex justify-between items-start">
                         <div>
                           <span className="font-bold text-slate-900 text-sm">{log.action.replace(/_/g, ' ')}</span>
                           <span className="text-xs text-slate-500 ml-2">by {log.actor?.full_name || 'System'} ({log.actor?.role})</span>
                         </div>
                         <div className="text-xs text-slate-400 whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</div>
                       </div>
                       
                       <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 mt-2 text-xs font-mono overflow-hidden">
                         <div className="text-slate-500 truncate"><span className="text-slate-400">Prev:</span> {log.previous_hash}</div>
                         <div className="text-slate-700 truncate mt-1"><span className="text-slate-400">Hash:</span> {log.new_hash}</div>
                         
                         {log.event_payload && (
                           <div className="mt-2 pt-2 border-t border-slate-200 text-slate-600 whitespace-pre-wrap break-all">
                             {JSON.stringify(log.event_payload, null, 2)}
                           </div>
                         )}

                         {Object.keys(verifyResults).length > 0 && (
                           <div className={`mt-2 pt-2 border-t ${isVerified ? 'border-emerald-200 text-emerald-700' : 'border-red-200 text-red-700'} font-sans font-bold flex items-center gap-1`}>
                             {isVerified ? <><ShieldCheck size={14}/> CHAIN VERIFIED</> : <><ShieldAlert size={14}/> INTEGRITY FAILURE</>}
                           </div>
                         )}
                       </div>
                     </div>
                   );
                 })}
               </div>
             )}
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Case Resolution</h2>
            {inv.status === 'resolved' ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-5">
                <div className="flex items-center gap-2 text-emerald-800 font-bold mb-3"><CheckCircle size={20}/> Case officially resolved</div>
                <p className="text-sm text-emerald-900 italic">"{inv.resolution_notes}"</p>
                <p className="text-xs text-emerald-600 mt-4 font-mono">Resolved: {new Date(inv.resolved_at).toLocaleString()}</p>
              </div>
            ) : (
              <form onSubmit={resolveCase} className="space-y-4">
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                  <h3 className="font-bold text-amber-800 text-sm flex items-center gap-2 mb-2"><AlertTriangle size={16}/> Warning</h3>
                  <p className="text-xs text-amber-700">Resolving this case indicates the Auditor has verified the fraud alert. This action is immutable and permanently closes the case number.</p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Final Resolution Summary (Required)</label>
                  <textarea required value={resolution} onChange={e=>setResolution(e.target.value)} rows={4} className="w-full border border-slate-200 p-3 rounded-lg text-sm focus:border-emerald-500 outline-none focus:ring-1 focus:ring-emerald-500" placeholder="e.g. Verified with Vendor via phone. Wire is authorized to proceed." />
                </div>
                <div className="flex justify-end pt-2">
                  <button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg font-bold text-sm shadow-sm flex items-center gap-2 transition-colors disabled:opacity-50">
                    {isSubmitting ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} Mark Case as Resolved
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
