"use client";

import { useState, useEffect } from "react";
import { Plus, ShieldAlert, CheckCircle2, Clock, FileText, Loader2, ExternalLink, XCircle, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { ROLES, Permissions } from "@/lib/roles";

type WireRequest = {
  id: string;
  vendor_name_snapshot: string;
  amount: number;
  purpose: string;
  status: "pending" | "approved" | "denied" | "frozen" | "under_review";
  created_at: string;
};

export default function Dashboard() {
  const [requests, setRequests] = useState<WireRequest[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("");

  useEffect(() => {
    const fetchWiresAndRole = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: userData } = await supabase.from('users').select('role').eq('id', session.user.id).single();
          setUserRole(userData?.role || "");
        }

        const cacheBuster = new Date().getTime();
        const res = await fetch(`/api/wires?t=${cacheBuster}`, { cache: 'no-store' });
        const json = await res.json();
        if (json.success) setRequests(json.data);
      } catch (err) {
        console.error("Failed to load wires");
      } finally {
        setIsLoading(false);
      }
    };
    fetchWiresAndRole();
  }, []);

  const handleNewRequest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const formData = new FormData(e.currentTarget);
    const payload = {
      vendor: formData.get("vendor") as string,
      amount: formData.get("amount") as string,
      purpose: formData.get("purpose") as string,
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

  // Only Clerks can access this specific Dashboard route
  if (!isLoading && userRole && userRole !== ROLES.CLERK) {
    // If somehow a non-clerk ends up here, gracefully guide them away
    return (
      <div className="text-center mt-20 p-8 max-w-md mx-auto bg-white rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Wrong Portal</h2>
        <p className="text-slate-500 mb-6">This dashboard is strictly for Accounts Payable Clerks to draft wires.</p>
        <Link href={Permissions.getPortalRoute(userRole as any)} className="text-blue-600 font-medium hover:underline">
          Go to your Executive Portal &rarr;
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Accounts Payable Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Draft outbound wires for executive authorization.</p>
        </div>
        {userRole === ROLES.CLERK && (
          <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-colors">
            <Plus size={18} /> New Wire Request
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
              <tr>
                <th className="px-6 py-4">Request ID (Link)</th>
                <th className="px-6 py-4">Vendor</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Purpose</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Audit PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">Loading your secure wires...</td></tr> : 
               requests.length === 0 ? <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">No requests drafted yet.</td></tr> : 
               requests.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-mono text-xs">
                    {/* Clerks should never see "Review & Sign". They only get "View Record". */}
                    <Link href={`/approve/${req.id}`} className="text-blue-600 hover:text-blue-800 flex items-center gap-1 font-semibold underline">
                      {req.id.substring(0, 8)}... <ExternalLink size={12} />
                    </Link>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900">{req.vendor_name_snapshot}</td>
                  <td className="px-6 py-4 text-slate-900 font-semibold">${Number(req.amount).toLocaleString()}</td>
                  <td className="px-6 py-4 text-slate-500 truncate max-w-[150px]">{req.purpose || '-'}</td>
                  <td className="px-6 py-4">
                    {req.status === "approved" && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200"><CheckCircle2 size={14} /> Approved</span>}
                    {req.status === "denied" && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200"><XCircle size={14} /> Denied</span>}
                    {req.status === "pending" && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200"><Clock size={14} /> Pending</span>}
                    {req.status === "frozen" && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200"><AlertTriangle size={14} /> Frozen</span>}
                    {req.status === "under_review" && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200"><Clock size={14} /> Under Review</span>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {req.status !== "pending" && req.status !== "frozen" && req.status !== "under_review" ? (
                      <a href={`/api/pdf/${req.id}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 text-sm font-medium">
                        <FileText size={16} /> PDF
                      </a>
                    ) : <span className="text-slate-300">-</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && userRole === ROLES.CLERK && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold">Initiate Wire Request</h2>
            </div>
            <form onSubmit={handleNewRequest} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Vendor / Destination</label>
                <input required name="vendor" type="text" placeholder="e.g. Acme Corp" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Amount (USD)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-500">$</span>
                  <input required name="amount" type="number" min="1" step="0.01" placeholder="50000" className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Purpose of Transfer</label>
                <input required name="purpose" type="text" placeholder="e.g. Q3 Invoice #8841" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 flex items-center gap-2">
                  {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : null} Request Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
