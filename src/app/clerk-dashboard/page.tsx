"use client";
import { useState, useEffect } from "react";
import { Plus, ShieldAlert, CheckCircle2, Clock, FileText, Loader2, ExternalLink, XCircle, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

export default function ClerkDashboard() {
  const [requests, setRequests] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchWires = async () => {
      try {
        const cacheBuster = new Date().getTime();
        const res = await fetch(`/api/wires?t=${cacheBuster}`, { cache: 'no-store' });
        const json = await res.json();
        if (json.success) setRequests(json.data);
      } catch (err) {} finally { setIsLoading(false); }
    };
    fetchWires();
  }, []);

  const handleNewRequest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const payload = { vendor: formData.get("vendor"), amount: formData.get("amount"), purpose: formData.get("purpose") };
    try {
      const res = await fetch('/api/wires', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await res.json();
      if (result.success) {
        setRequests([result.data, ...requests]);
        setIsModalOpen(false);
        alert(`Success! Data saved securely.`);
      } else { alert("Error: " + result.error); }
    } catch (err) { alert("Failed to connect to server."); } finally { setIsSubmitting(false); }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto mt-10">
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
                  <td className="px-6 py-4">{req.status}</td>
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
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100"><h2 className="text-xl font-bold">Initiate Wire Request</h2></div>
            <form onSubmit={handleNewRequest} className="p-6 space-y-4">
              <div><label>Vendor</label><input required name="vendor" className="w-full border p-2 rounded" /></div>
              <div><label>Amount</label><input required name="amount" type="number" min="1" step="0.01" className="w-full border p-2 rounded" /></div>
              <div><label>Purpose</label><input required name="purpose" className="w-full border p-2 rounded" /></div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white px-4 py-2 rounded">{isSubmitting ? 'Sending...' : 'Request Approval'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
