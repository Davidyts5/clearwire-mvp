"use client";

import { useState, useEffect } from "react";
import { Plus, ShieldAlert, CheckCircle2, Clock, FileText, Loader2, ExternalLink } from "lucide-react";
import Link from "next/link";

type WireRequest = {
  id: string;
  vendor_name: string;
  amount: number;
  status: "pending" | "approved" | "denied";
  created_at: string;
};

export default function Dashboard() {
  const [requests, setRequests] = useState<WireRequest[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch data on page load
  useEffect(() => {
    const fetchWires = async () => {
      try {
        const res = await fetch('/api/wires');
        const json = await res.json();
        if (json.success) {
          setRequests(json.data);
        }
      } catch (err) {
        console.error("Failed to load wires");
      } finally {
        setIsLoading(false);
      }
    };
    fetchWires();
  }, []);

  const handleNewRequest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const formData = new FormData(e.currentTarget);
    const payload = {
      vendor: formData.get("vendor") as string,
      amount: formData.get("amount") as string,
    };
    
    try {
      const res = await fetch('/api/wires', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (result.success) {
        setRequests([result.data, ...requests]);
        setIsModalOpen(false);
        alert(`Success! Data saved securely.`);
      } else {
        alert("Error: " + result.error);
      }
    } catch (err) {
      alert("Failed to connect to server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Accounts Payable Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Manage outbound wires and cryptographically verify approvals.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-colors"
        >
          <Plus size={18} />
          New Wire Request
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
              <tr>
                <th className="px-6 py-4">Request ID (Link)</th>
                <th className="px-6 py-4">Vendor</th>
                <th className="px-6 py-4">Amount (USD)</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Certificate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">Loading secure wires...</td></tr>
              ) : requests.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">No requests yet.</td></tr>
              ) : requests.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-mono text-xs">
                    <Link href={`/approve/${req.id}`} className="text-blue-600 hover:text-blue-800 flex items-center gap-1 font-semibold underline">
                      {req.id.substring(0, 8)}... <ExternalLink size={12} />
                    </Link>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900">{req.vendor_name}</td>
                  <td className="px-6 py-4 text-slate-900">${Number(req.amount).toLocaleString()}</td>
                  <td className="px-6 py-4">
                    {req.status === "approved" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 size={14} /> Approved
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                        <Clock size={14} /> Pending
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {req.status === "approved" ? (
                      <button className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 text-sm font-medium">
                        <FileText size={16} /> PDF
                      </button>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
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
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold">Initiate Wire Request</h2>
              <p className="text-sm text-slate-500 mt-1">This will insert data into Supabase and notify the CFO.</p>
            </div>
            <form onSubmit={handleNewRequest} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Vendor / Destination</label>
                <input required name="vendor" type="text" placeholder="e.g. Acme Corp" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Amount (USD)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-500">$</span>
                  <input required name="amount" type="number" min="1" step="0.01" placeholder="50000" className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-70">
                  {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : null}
                  {isSubmitting ? 'Sending...' : 'Request Approval'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
