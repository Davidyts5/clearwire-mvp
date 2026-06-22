"use client";
import { useState, useEffect } from "react";
import { Plus, CheckCircle2, Clock, FileText, Loader2, ExternalLink, XCircle, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function ClerkDashboard() {
  const [requests, setRequests] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [selectedVendorId, setSelectedVendorId] = useState<string>("");
  const [vendorName, setVendorName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [swiftBic, setSwiftBic] = useState("");

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
        
        if (wireJson.success) setRequests(wireJson.data);
        if (vendorJson.success) setVendors(vendorJson.data);
      } catch (err) {} finally { setIsLoading(false); }
    };
    fetchData();
  }, []);

  const handleVendorSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const vId = e.target.value;
    setSelectedVendorId(vId);
    
    if (vId === "new") {
      setVendorName("");
      setAccountNumber("");
      setSwiftBic("");
    } else {
      const v = vendors.find(v => v.id === vId);
      if (v) {
        setVendorName(v.name);
        setAccountNumber(v.account_number || "");
        setSwiftBic(v.swift_bic || "");
      }
    }
  };

  const handleNewRequest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    
    const payload = { 
      vendor: vendorName, 
      amount: formData.get("amount"), 
      purpose: formData.get("purpose"),
      account_number: accountNumber,
      swift_bic: swiftBic
    };

    try {
      const res = await fetch('/api/wires', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await res.json();
      if (result.success) {
        setRequests([result.data, ...requests]);
        setIsModalOpen(false);
        if (result.data.status === 'frozen') {
          alert(`Warning: This request was flagged by the Risk Engine and frozen for CFO review.`);
        } else {
          alert(`Success! Data saved securely.`);
        }
      } else { alert("Error: " + result.error); }
    } catch (err) { alert("Failed to connect to server."); } finally { setIsSubmitting(false); }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto mt-10 px-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Accounts Payable Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Draft outbound wires for executive authorization.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-colors">
          <Plus size={18} /> New Wire Request
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
              <tr><th className="px-6 py-4">Request ID</th><th className="px-6 py-4">Vendor</th><th className="px-6 py-4">Amount</th><th className="px-6 py-4">Status</th><th className="px-6 py-4">Audit PDF</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">Loading...</td></tr> : 
               requests.length === 0 ? <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">No requests drafted yet.</td></tr> : 
               requests.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-mono text-xs">
                    <Link href={`/approve/${req.id}`} className="text-blue-600 hover:text-blue-800 flex items-center gap-1 font-semibold underline">{req.id.substring(0, 8)}... <ExternalLink size={12} /></Link>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900">{req.vendor_name_snapshot}</td>
                  <td className="px-6 py-4 text-slate-900 font-semibold">${Number(req.amount).toLocaleString()}</td>
                  <td className="px-6 py-4">
                    {req.status === 'frozen' ? <span className="text-red-600 font-bold flex items-center gap-1"><AlertTriangle size={14}/> Frozen</span> : req.status}
                  </td>
                  <td className="px-6 py-4">
                    {req.status === 'approved' ? <a href={`/api/pdf/${req.id}`} className="text-blue-600">PDF</a> : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
                    <input required value={accountNumber} onChange={e=>setAccountNumber(e.target.value)} className="w-full border p-2 rounded font-mono text-sm" placeholder="e.g. GB29NWBK60161331926819" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">SWIFT / BIC (Optional)</label>
                    <input value={swiftBic} onChange={e=>setSwiftBic(e.target.value)} className="w-full border p-2 rounded font-mono text-sm uppercase" placeholder="e.g. BOFAUS3N" />
                  </div>
                </div>
              )}

              <div><label className="block text-sm font-bold text-slate-700 mb-1 mt-4">Amount (USD)</label><input required name="amount" type="number" min="1" step="0.01" className="w-full border p-2 rounded font-mono" /></div>
              <div><label className="block text-sm font-bold text-slate-700 mb-1">Purpose / Invoice Reference</label><input required name="purpose" className="w-full border p-2 rounded" placeholder="Invoice #INV-2026-991" /></div>
              
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
