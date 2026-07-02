"use client";

import { useState, useEffect } from "react";
import { CheckSquare, Loader2, FileText, CheckCircle, XCircle, ArrowRightRight, Eye, ShieldCheck, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { ROLES } from "@/lib/roles";
import DataFilters, { FilterConfig } from "@/components/DataFilters";

export default function VendorRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("");
  const [viewingRequest, setViewingRequest] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionReason, setActionReason] = useState("");
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: userData } = await supabase.from('users').select('role').eq('id', session.user.id).single();
        setUserRole(userData?.role || "");
      }

      const cacheBuster = new Date().getTime();
      const res = await fetch(`/api/vendors/requests?t=${cacheBuster}`, { cache: 'no-store' });
      const json = await res.json();
      
      if (json.success) {
        setRequests(json.data);
        setFilteredRequests(json.data);
      }
    } catch (err) {} finally { setIsLoading(false); }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleReviewClick = async (req: any) => {
    setViewingRequest(req);
    setActionReason("");
    setDocumentUrl(null);
    if (req.document_path) {
      const supabase = createClient();
      const { data } = await supabase.storage.from('invoices').createSignedUrl(req.document_path, 3600);
      if (data) setDocumentUrl(data.signedUrl);
    }
  };

  const handleAction = async (action: 'approve' | 'reject' | 'escalate') => {
    if (action === 'reject' && !actionReason.trim()) {
      alert("Rejection reason is required.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/vendors/requests/${viewingRequest.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason: actionReason })
      });
      const result = await res.json();
      if (result.success) {
        setViewingRequest(null);
        fetchRequests(); // Refresh the list
      } else {
        alert("Error: " + result.error);
      }
    } catch (err) {
      alert("Failed to submit action.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filterConfig: FilterConfig = {
    searchPlaceholder: "Search vendor or ID...",
    searchKeys: ['vendors.name', 'id'],
    statuses: [
      { label: 'Pending', value: 'pending' },
      { label: 'Awaiting CFO', value: 'awaiting_cfo' },
      { label: 'Approved', value: 'approved' },
      { label: 'Rejected', value: 'rejected' },
    ],
    sortOptions: [
      { label: 'Newest First', value: 'newest' },
      { label: 'Oldest First', value: 'oldest' },
    ]
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto mt-10 px-4">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><CheckSquare size={24}/> Vendor Authorization Queue</h1>
          <p className="text-slate-500 text-sm mt-1">Review and approve vendor master data changes.</p>
        </div>
      </div>

      <DataFilters data={requests} config={filterConfig} onFilterChange={setFilteredRequests} />

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
              <tr>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Vendor</th>
                <th className="px-6 py-4">Requested By</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500"><Loader2 className="w-6 h-6 animate-spin mx-auto"/></td></tr> : 
               filteredRequests.length === 0 ? <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">No requests found.</td></tr> : 
               filteredRequests.map((req) => {
                 const isActionable = (req.status === 'pending' && userRole === ROLES.CONTROLLER) || (req.status === 'awaiting_cfo' && userRole === ROLES.CFO);
                 
                 return (
                  <tr key={req.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium">
                      {req.status === 'pending' ? <span className="text-amber-600 flex items-center gap-1"><Loader2 size={14}/> Pending Review</span> :
                       req.status === 'awaiting_cfo' ? <span className="text-purple-600 flex items-center gap-1"><ArrowRightRight size={14}/> Escalated to CFO</span> :
                       req.status === 'approved' ? <span className="text-emerald-600 flex items-center gap-1"><CheckCircle size={14}/> Approved</span> :
                       <span className="text-red-600 flex items-center gap-1"><XCircle size={14}/> Rejected</span>}
                    </td>
                    <td className="px-6 py-4 text-slate-900 font-bold">{req.vendors?.name || 'Unknown Vendor'}</td>
                    <td className="px-6 py-4 text-slate-500">{req.users?.full_name || 'Unknown User'}</td>
                    <td className="px-6 py-4 text-slate-500">{new Date(req.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handleReviewClick(req)} className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${isActionable ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                        {isActionable ? 'Review Request' : 'View Record'} <Eye size={14}/>
                      </button>
                    </td>
                  </tr>
                 );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {viewingRequest && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl overflow-hidden my-8 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${viewingRequest.status === 'approved' ? 'bg-emerald-100 text-emerald-600' : viewingRequest.status === 'rejected' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                  {viewingRequest.status === 'approved' ? <CheckCircle size={24} /> : viewingRequest.status === 'rejected' ? <XCircle size={24} /> : <ShieldCheck size={24} />}
                </div>
                <div>
                  <h2 className="text-xl font-bold">Vendor Change Request</h2>
                  <p className="text-sm text-slate-500">Requested by {viewingRequest.users?.full_name} on {new Date(viewingRequest.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
              <div className="bg-white border border-slate-200 rounded-lg p-4 mb-6 shadow-sm">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Reason for Change</span>
                <p className="font-medium text-slate-800">{viewingRequest.reason}</p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-slate-100 px-4 py-3 border-b border-slate-200"><h3 className="font-bold text-slate-700">Current Values</h3></div>
                  <div className="p-4 space-y-3">
                    {Object.keys(viewingRequest.old_data || {}).map(key => (
                      <div key={key}>
                        <span className="text-xs font-bold text-slate-400 uppercase block">{key.replace(/_/g, ' ')}</span>
                        <span className={`text-sm ${viewingRequest.old_data?.[key] !== viewingRequest.new_data?.[key] ? 'line-through text-red-500' : 'text-slate-700'}`}>{viewingRequest.old_data[key] || 'None'}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white border border-blue-200 rounded-xl overflow-hidden shadow-sm ring-1 ring-blue-50">
                  <div className="bg-blue-50 px-4 py-3 border-b border-blue-100"><h3 className="font-bold text-blue-800 flex items-center gap-2"><ArrowRightRight size={16}/> Requested Changes</h3></div>
                  <div className="p-4 space-y-3">
                    {Object.keys(viewingRequest.new_data || {}).map(key => {
                      const isChanged = viewingRequest.old_data?.[key] !== viewingRequest.new_data?.[key];
                      return (
                        <div key={key}>
                          <span className="text-xs font-bold text-slate-400 uppercase block">{key.replace(/_/g, ' ')}</span>
                          <span className={`text-sm ${isChanged ? 'font-bold text-emerald-600 bg-emerald-50 px-1 rounded' : 'text-slate-700'}`}>{viewingRequest.new_data[key] || 'None'}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {documentUrl && (
                <div className="mt-6 flex justify-end">
                  <a href={documentUrl} target="_blank" className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 px-4 py-2 rounded-lg border border-blue-100">
                    <FileText size={16}/> View Supporting Document
                  </a>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 bg-white shrink-0">
              {((viewingRequest.status === 'pending' && userRole === ROLES.CONTROLLER) || (viewingRequest.status === 'awaiting_cfo' && userRole === ROLES.CFO)) ? (
                <div className="space-y-4">
                  <input type="text" placeholder="Optional notes or required rejection reason..." value={actionReason} onChange={(e) => setActionReason(e.target.value)} className="w-full border p-2 rounded text-sm" />
                  <div className="flex items-center justify-between">
                    <button type="button" onClick={() => setViewingRequest(null)} className="text-slate-500 font-medium text-sm">Cancel</button>
                    <div className="flex gap-2">
                      <button onClick={() => handleAction('reject')} disabled={isSubmitting} className="bg-red-100 text-red-700 hover:bg-red-200 px-4 py-2 rounded-lg font-bold text-sm transition-colors">Reject</button>
                      {userRole === ROLES.CONTROLLER && <button onClick={() => handleAction('escalate')} disabled={isSubmitting} className="bg-purple-100 text-purple-700 hover:bg-purple-200 px-4 py-2 rounded-lg font-bold text-sm transition-colors">Escalate to CFO</button>}
                      <button onClick={() => handleAction('approve')} disabled={isSubmitting} className="bg-emerald-600 text-white hover:bg-emerald-700 px-6 py-2 rounded-lg font-bold text-sm transition-colors shadow-sm">Authorize & Update</button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <p className="text-sm text-slate-500 italic">This request has already been processed or you do not have permission to authorize it.</p>
                  <button type="button" onClick={() => setViewingRequest(null)} className="bg-slate-200 text-slate-800 px-4 py-2 rounded-lg font-medium text-sm">Close</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
