"use client";

import { useState, useEffect } from "react";
import { CheckSquare, Loader2, FileText, CheckCircle, XCircle, ArrowRight, Eye, ShieldCheck, AlertTriangle, PhoneCall } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { ROLES } from "@/lib/roles";
import DataFilters, { FilterConfig } from "@/components/DataFilters";

export default function VendorRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("");
  const [vendorAuthPolicy, setVendorAuthPolicy] = useState("controller_any");
  const [viewingRequest, setViewingRequest] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionReason, setActionReason] = useState("");
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [rejectFlow, setRejectFlow] = useState(false);
  const [restrictVendor, setRestrictVendor] = useState(false);
  const [callbackRecord, setCallbackRecord] = useState<any>(null);
  const [contactName, setContactName] = useState("");
  const [callbackNotes, setCallbackNotes] = useState("");
  const [isSubmittingCallback, setIsSubmittingCallback] = useState(false);
  const [callbackError, setCallbackError] = useState<string | null>(null);

  useEffect(() => {
    if (viewingRequest) {
      const fetchCb = async () => {
        const supabase = createClient();
        const { data } = await supabase.from('vendor_callback_verifications').select('*').eq('change_request_id', viewingRequest.id).single();
        if (data) setCallbackRecord(data);
        else setCallbackRecord(null);
      };
      fetchCb();
    } else {
      setCallbackRecord(null);
      setContactName("");
      setCallbackNotes("");
    }
  }, [viewingRequest]);

  const handleCallbackSubmit = async (e: any) => {
    e.preventDefault();
    setIsSubmittingCallback(true);
    setCallbackError(null);
    try {
      const res = await fetch(`/api/vendors/requests/${viewingRequest.id}/callback-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number_called: viewingRequest.old_data?.phone_number, contact_name: contactName, notes: callbackNotes })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to submit callback verification');
      setCallbackRecord(json.data);
    } catch (err: any) {
      setCallbackError(err.message);
    } finally {
      setIsSubmittingCallback(false);
    }
  };


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
      const setRes = await fetch(`/api/settings?t=${cacheBuster}`);
      const setJson = await setRes.json();
      if (setJson.data?.vendor_auth_policy) setVendorAuthPolicy(setJson.data.vendor_auth_policy);
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
    setRejectFlow(false);
    setRestrictVendor(false);
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
        body: JSON.stringify({ action, reason: actionReason, restrict_vendor: restrictVendor })
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
                       req.status === 'awaiting_cfo' ? <span className="text-purple-600 flex items-center gap-1"><ArrowRight size={14}/> Escalated to CFO</span> :
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
                <div className={`p-2 rounded-lg ${viewingRequest.status === 'approved' ? 'bg-emerald-100 text-emerald-600' : viewingRequest.status === 'rejected' || viewingRequest.status === 'rejected_flagged' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                  {viewingRequest.status === 'approved' ? <CheckCircle size={24} /> : viewingRequest.status === 'rejected' || viewingRequest.status === 'rejected_flagged' ? <XCircle size={24} /> : <ShieldCheck size={24} />}
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
                    {Object.keys(viewingRequest.new_data || {}).filter(key => viewingRequest.old_data?.[key] !== viewingRequest.new_data?.[key]).map(key => (
                      <div key={key}>
                        <span className="text-xs font-bold text-slate-400 uppercase block">{key.replace(/_/g, ' ')}</span>
                        <span className={`text-sm ${viewingRequest.old_data?.[key] !== viewingRequest.new_data?.[key] ? 'line-through text-red-500' : 'text-slate-700'}`}>{viewingRequest.old_data?.[key] || 'None'}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white border border-blue-200 rounded-xl overflow-hidden shadow-sm ring-1 ring-blue-50">
                  <div className="bg-blue-50 px-4 py-3 border-b border-blue-100"><h3 className="font-bold text-blue-800 flex items-center gap-2"><ArrowRight size={16}/> Requested Changes</h3></div>
                  <div className="p-4 space-y-3">
                    {Object.keys(viewingRequest.new_data || {}).filter(key => viewingRequest.old_data?.[key] !== viewingRequest.new_data?.[key]).map(key => {
                      const isChanged = viewingRequest.old_data?.[key] !== viewingRequest.new_data?.[key];
                      return (
                        <div key={key}>
                          <span className="text-xs font-bold text-slate-400 uppercase block">{key.replace(/_/g, ' ')}</span>
                          <span className={`text-sm ${isChanged ? 'font-bold text-emerald-600 bg-emerald-50 px-1 rounded' : 'text-slate-700'}`}>{viewingRequest.new_data?.[key] || 'None'}</span>
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
              

              {((viewingRequest.status === "pending" && userRole === ROLES.CONTROLLER) || (viewingRequest.status === "awaiting_cfo" && userRole === ROLES.CFO)) ? (
                (() => {
                  const isBankChange = viewingRequest.old_data?.account_number !== viewingRequest.new_data?.account_number || viewingRequest.old_data?.swift_bic !== viewingRequest.new_data?.swift_bic;
                  const canControllerApprove = vendorAuthPolicy === 'controller_any' || (vendorAuthPolicy === 'cfo_bank_only' && !isBankChange);
                  const showApproveButton = userRole === ROLES.CFO || canControllerApprove;
                  const hasPhoneNumber = !!viewingRequest.old_data?.phone_number;
                  const isCallbackPending = isBankChange && !callbackRecord;

                  return rejectFlow ? (

                  <div className="space-y-4 bg-red-50 p-4 rounded-xl border border-red-100">
                    <h3 className="font-bold text-red-800 flex items-center gap-2"><AlertTriangle size={18}/> Confirm Rejection</h3>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Reason for rejection (Required)</label>
                      <textarea required value={actionReason} onChange={e => setActionReason(e.target.value)} className="w-full border p-2 rounded text-sm bg-white" rows={2} placeholder="Why is this change being rejected?" />
                    </div>
                    {userRole === ROLES.CFO && (
                      <div className="space-y-2 mt-4">
                        <label className="block text-sm font-bold text-slate-700">Action after rejection:</label>
                        <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${!restrictVendor ? "bg-white border-blue-500 ring-1 ring-blue-500" : "bg-white border-slate-200"}`}>
                          <input type="radio" checked={!restrictVendor} onChange={() => setRestrictVendor(false)} className="mt-1" />
                          <div>
                            <div className="font-bold text-slate-900 text-sm">Keep Vendor Active</div>
                            <div className="text-xs text-slate-500">Reject the requested change but continue normal business with the currently approved vendor details.</div>
                          </div>
                        </label>
                        <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${restrictVendor ? "bg-red-50 border-red-500 ring-1 ring-red-500" : "bg-white border-slate-200"}`}>
                          <input type="radio" checked={restrictVendor} onChange={() => setRestrictVendor(true)} className="mt-1" />
                          <div>
                            <div className="font-bold text-red-900 text-sm">Restrict Vendor</div>
                            <div className="text-xs text-red-700">Reject the requested change and temporarily block all new business with this vendor until the restriction is removed.</div>
                          </div>
                        </label>
                      </div>
                    )}
                    <div className="flex justify-end gap-3 pt-4 border-t border-red-200/50">
                      <button type="button" onClick={() => setRejectFlow(false)} className="px-4 py-2 font-medium text-slate-600 hover:text-slate-900 text-sm">Cancel</button>
                      <button onClick={() => handleAction("reject")} disabled={isSubmitting || !actionReason.trim()} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-bold text-sm transition-colors shadow-sm flex items-center gap-2">
                        {isSubmitting ? <Loader2 className="animate-spin" size={16}/> : "Confirm Rejection"}
                      </button>
                    </div>
                  </div>
                ) : (

                  <div className="space-y-4">
                    {isBankChange && (
                      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
                        <div className="p-4 border-b border-slate-100 bg-amber-50/50">
                          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <PhoneCall className="text-amber-600" size={18} /> Vendor Callback Verification Required
                          </h2>
                          <p className="text-xs text-slate-600 mt-1">
                            Because this request alters banking or routing details, policy requires an out-of-band phone call to the vendor's pre-existing phone number.
                          </p>
                        </div>
                        
                        <div className="p-5">
                          {!hasPhoneNumber ? (
                            <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 text-sm font-medium flex gap-2">
                               <AlertTriangle size={20} className="shrink-0"/>
                               No verified phone number exists for this vendor. Source one independently (e.g., from a contract or invoice — not from this request) and add it to the vendor's profile before this change can be approved.
                            </div>
                          ) : callbackRecord ? (
                             <div className="p-4 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200 text-sm font-medium">
                               <div className="flex items-center gap-2 font-bold mb-2"><CheckCircle size={18}/> Callback Verification Completed</div>
                               <div className="grid grid-cols-2 gap-4 mt-2">
                                 <div><span className="text-xs text-emerald-600 uppercase block">Called Number</span> {callbackRecord.phone_number_called}</div>
                                 <div><span className="text-xs text-emerald-600 uppercase block">Spoke With</span> {callbackRecord.contact_name}</div>
                                 <div className="col-span-2"><span className="text-xs text-emerald-600 uppercase block">Notes</span> {callbackRecord.notes}</div>
                               </div>
                             </div>
                          ) : (
                            <form onSubmit={handleCallbackSubmit} className="space-y-4">
                              {callbackError && (
                                <div className="p-3 bg-red-50 text-red-700 rounded-lg border border-red-200 text-sm font-medium mb-4">{callbackError}</div>
                              )}
                              
                              <div className="bg-slate-50 p-4 rounded border border-slate-200 text-center">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Number to Call (From File)</p>
                                <p className="text-2xl font-bold font-mono tracking-tight text-slate-900">{viewingRequest.old_data.phone_number}</p>
                              </div>
                              
                              <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Who did you speak to?</label>
                                <input required value={contactName} onChange={e=>setContactName(e.target.value)} className="w-full border border-slate-200 p-2.5 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="e.g. Jane Doe (Accounts Receivable)" />
                              </div>
                              
                              <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Notes / Confirmation Details</label>
                                <textarea required value={callbackNotes} onChange={e=>setCallbackNotes(e.target.value)} rows={3} className="w-full border border-slate-200 p-2.5 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="e.g. Confirmed new ending in *5678 replaces old account ending in *1234." />
                              </div>
                              
                              <div className="pt-2 flex justify-end">
                                 <button type="submit" disabled={isSubmittingCallback} className="bg-blue-600 text-white font-bold px-6 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm">
                                   {isSubmittingCallback ? <Loader2 size={16} className="animate-spin" /> : <PhoneCall size={16} />} Record Verification
                                 </button>
                              </div>
                            </form>
                          )}
                        </div>
                      </div>
                    )}
                    <input type="text" placeholder="Optional notes for approval..." value={actionReason} onChange={(e) => setActionReason(e.target.value)} className="w-full border p-2 rounded text-sm bg-slate-50" />
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <button type="button" onClick={() => setViewingRequest(null)} className="text-slate-500 font-medium text-sm">Cancel</button>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <button onClick={() => setRejectFlow(true)} className="bg-red-100 text-red-700 hover:bg-red-200 px-4 py-2 rounded-lg font-bold text-sm transition-colors">Reject...</button>
                        {userRole === ROLES.CONTROLLER && <button onClick={() => handleAction("escalate")} disabled={isSubmitting || (isBankChange && (!hasPhoneNumber || isCallbackPending))} className="bg-purple-100 text-purple-700 hover:bg-purple-200 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-lg font-bold text-sm transition-colors">Escalate to CFO</button>}
                        {showApproveButton ? (
                          <button onClick={() => handleAction("approve")} disabled={isSubmitting || (isBankChange && (!hasPhoneNumber || isCallbackPending))} className="bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2 rounded-lg font-bold text-sm transition-colors shadow-sm">Authorize & Update</button>
                        ) : (
                          <div className="bg-amber-50 text-amber-800 px-4 py-2 rounded-lg font-bold text-sm border border-amber-200">CFO Authorization Required</div>
                        )}
                      </div>
                    </div>
                  </div>

                )
                })()
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
