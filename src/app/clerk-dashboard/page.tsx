"use client";
import { useState, useEffect } from "react";
import { Plus, CheckCircle2, Clock, FileText, Loader2, ExternalLink, XCircle, AlertTriangle, MessageSquare, Activity } from "lucide-react";
import Link from "next/link";
import DataFilters, { FilterConfig } from "@/components/DataFilters";

export default function ClerkDashboard() {
  const [requests, setRequests] = useState<any[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [viewingRejection, setViewingRejection] = useState<any>(null);

  const [selectedVendorId, setSelectedVendorId] = useState<string>("");
  const [vendorName, setVendorName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [swiftBic, setSwiftBic] = useState("");
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const cacheBuster = new Date().getTime();
        const [wireRes, vendorRes] = await Promise.all([
          fetch(`/api/wires?t=${cacheBuster}`, { cache: 'no-store' }),
          fetch(`/api/vendors?t=${cacheBuster}`, { cache: 'no-store' })
        ]);
        
        const wireJson = await wireRes.json();
        const vendorJson = await vendorRes.json();
        
        if (wireJson.success) {
          setRequests(wireJson.data);
          setFilteredRequests(wireJson.data);
        }
        if (vendorJson.success) setVendors(vendorJson.data);
      } catch (err) {} finally { setIsLoading(false); }
    };
    fetchData();
  }, []);

  const handleVendorSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const vId = e.target.value;
    setSelectedVendorId(vId);
    if (vId === "new") {
      setVendorName(""); setAccountNumber(""); setSwiftBic("");
    } else {
      const v = vendors.find(v => v.id === vId);
      if (v) {
        setVendorName(v.name); setAccountNumber(v.account_number || ""); setSwiftBic(v.swift_bic || "");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) { alert("File must be smaller than 2MB."); e.target.value = ''; return; }
      setInvoiceFile(file);
    }
  };

  const handleNewRequest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    formData.set("vendor", vendorName);
    formData.set("account_number", accountNumber);
    formData.set("swift_bic", swiftBic);
    if (invoiceFile) formData.set("invoice", invoiceFile);

    try {
      const res = await fetch('/api/wires', { method: 'POST', body: formData });
      const result = await res.json();
      if (result.success) {
        const newData = [result.data, ...requests];
        setRequests(newData);
        setFilteredRequests(newData);
        setIsModalOpen(false);
        setInvoiceFile(null);
      } else { alert("Error: " + result.error); }
    } catch (err) { alert("Failed to connect to server."); } finally { setIsSubmitting(false); }
  };

  const filterConfig: FilterConfig = {
    searchPlaceholder: "Search vendor, purpose, or ID...",
    searchKeys: ['vendor_name_snapshot', 'purpose', 'id'],
    statuses: [
      { label: 'Pending Auth', value: 'pending' },
      { label: 'Approved', value: 'approved' },
      { label: 'Denied', value: 'denied' },
      { label: 'Frozen', value: 'frozen' },
      { label: 'Under Review', value: 'under_review' },
    ],
    sortOptions: [
      { label: 'Newest First', value: 'newest' },
      { label: 'Oldest First', value: 'oldest' },
      { label: 'Highest Amount', value: 'highest_amount' },
      { label: 'Lowest Amount', value: 'lowest_amount' },
      { label: 'Vendor A-Z', value: 'vendor_a_z' },
    ],
    showDateFilter: true
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 md:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-3"><Activity size={28} className="text-blue-600"/> AP Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Manage and track your wire drafts.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5">
          <Plus size={18} /> New Wire Request
        </button>
      </div>

      <DataFilters data={requests} config={filterConfig} onFilterChange={setFilteredRequests} />

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
              <tr><th className="px-6 py-4">Request ID</th><th className="px-6 py-4">Vendor</th><th className="px-6 py-4">Amount</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-right">Audit PDF</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500"><Loader2 className="animate-spin mx-auto"/></td></tr> : 
               filteredRequests.length === 0 ? <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500">No requests found.</td></tr> : 
               filteredRequests.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-mono text-xs">
                    <Link href={`/approve/${req.id}`} className="text-blue-600 hover:text-blue-800 flex items-center gap-1 font-semibold underline">{req.id.substring(0, 8)}... <ExternalLink size={12} /></Link>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900">{req.vendor_name_snapshot}</td>
                  <td className="px-6 py-4 text-slate-900 font-semibold">${Number(req.amount).toLocaleString()}</td>
                  <td className="px-6 py-4">
                    {req.status === 'frozen' ? <span className="text-red-600 font-bold flex items-center gap-1"><AlertTriangle size={14}/> Frozen</span> : 
                     req.status === 'denied' ? (
                       <button onClick={() => setViewingRejection(req)} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200 hover:bg-red-200 transition-colors">
                         <XCircle size={14} /> Denied (View Notes)
                       </button>
                     ) : req.status}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {req.status === 'approved' ? <a href={`/api/pdf/${req.id}`} target="_blank" className="text-blue-600 font-semibold inline-flex items-center gap-1"><FileText size={14}/> PDF</a> : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {viewingRejection && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden my-8 animate-in fade-in zoom-in-95">
            <div className="p-6 border-b border-slate-100"><h2 className="text-xl font-bold flex items-center gap-2 text-red-600"><XCircle size={24} /> Wire Rejected</h2></div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Rejection Reason</span>
                <span className="font-semibold text-slate-900">{viewingRejection.rejection_reason || 'Declined by Executive'}</span>
              </div>
              {viewingRejection.rejection_notes && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <span className="text-xs font-bold text-blue-800 uppercase block mb-1 flex items-center gap-1"><MessageSquare size={12}/> Notes from Approver</span>
                  <span className="text-sm text-blue-900 italic">"{viewingRejection.rejection_notes}"</span>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button onClick={() => setViewingRejection(null)} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-sm font-medium">Close</button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden my-8">
            <div className="p-6 border-b border-slate-100"><h2 className="text-xl font-bold">Initiate Wire Request</h2></div>
            <form onSubmit={handleNewRequest} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Select Vendor</label>
                <select value={selectedVendorId} onChange={handleVendorSelect} className="w-full border p-2 rounded text-sm bg-slate-50">
                  <option value="" disabled>-- Select a Vendor --</option>
                  <option value="new" className="font-bold">+ Add New Vendor</option>
                  {vendors.map(v => (
                    <option key={v.id} value={v.id}>{v.name} (Acct: *{v.account_number?.slice(-4) || 'N/A'})</option>
                  ))}
                </select>
              </div>
              {selectedVendorId === "new" && (
                <div className="animate-in fade-in slide-in-from-top-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1">New Vendor Name</label>
                  <input required value={vendorName} onChange={e=>setVendorName(e.target.value)} className="w-full border p-2 rounded" />
                </div>
              )}
              {selectedVendorId && (
                <div className="space-y-4 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Bank Account / IBAN</label>
                    <input value={accountNumber} onChange={e=>setAccountNumber(e.target.value)} className="w-full border p-2 rounded font-mono text-sm" placeholder="e.g. GB29NWBK60161331926819" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">SWIFT / BIC (Optional)</label>
                    <input value={swiftBic} onChange={e=>setSwiftBic(e.target.value)} className="w-full border p-2 rounded font-mono text-sm uppercase" placeholder="e.g. BOFAUS3N" />
                  </div>
                </div>
              )}
              <div><label className="block text-sm font-bold text-slate-700 mb-1 mt-4">Amount (USD)</label><input required name="amount" type="number" min="1" step="0.01" className="w-full border p-2 rounded font-mono" /></div>
              <div><label className="block text-sm font-bold text-slate-700 mb-1">Purpose / Invoice Reference</label><input required name="purpose" className="w-full border p-2 rounded" placeholder="Invoice #INV-2026-991" /></div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <label className="block text-sm font-bold text-slate-700 mb-1">Attach Source Invoice (Optional)</label>
                <input type="file" accept=".pdf,.png,.jpg" onChange={handleFileChange} className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                <p className="text-[10px] text-slate-400 mt-1">PDF, PNG, JPG up to 2MB. Highly recommended to avoid Risk Engine penalties.</p>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" disabled={!selectedVendorId || isSubmitting} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded font-medium shadow-sm flex items-center gap-2">
                  {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : null} Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
