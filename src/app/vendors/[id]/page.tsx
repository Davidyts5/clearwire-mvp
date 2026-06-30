"use client";
import { useState, useEffect } from "react";
import { Loader2, ArrowLeft, Building2, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { ROLES } from "@/lib/roles";

export default function VendorDetail({ params }: { params: { id: string } }) {
  const [vendor, setVendor] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: userData } = await supabase.from('users').select('role').eq('id', session.user.id).single();
          setUserRole(userData?.role || "");
        }

        const res = await fetch(`/api/vendors/${params.id}`);
        const json = await res.json();
        if (json.success) setVendor(json.data);
      } catch (err) {} finally { setIsLoading(false); }
    };
    fetchData();
  }, [params.id]);

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const payload = Object.fromEntries(formData.entries());
    
    try {
      const res = await fetch(`/api/vendors/${params.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await res.json();
      if (result.success) {
        setIsModalOpen(false);
        alert(`Bank Change Request submitted to Controller/CFO for approval.`);
      } else { alert("Error: " + result.error); }
    } catch (err) { alert("Failed to connect to server."); } finally { setIsSubmitting(false); }
  };

  if (isLoading) return <div className="text-center mt-20 text-slate-500 font-medium animate-pulse">Loading Vendor Profile...</div>;
  if (!vendor) return <div className="text-center mt-20 text-red-500 font-bold">Vendor Not Found</div>;

  return (
    <div className="max-w-4xl mx-auto mt-10 px-4 space-y-6">
      <Link href="/vendors" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
        <ArrowLeft size={16} /> Back to Directory
      </Link>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
              <Building2 size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{vendor.name}</h1>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider mt-1 ${vendor.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'}`}>
                {vendor.status}
              </span>
            </div>
          </div>
          {userRole === ROLES.CLERK && (
            <button onClick={() => setIsModalOpen(true)} className="bg-amber-100 hover:bg-amber-200 text-amber-800 px-4 py-2 rounded-lg font-medium shadow-sm transition-colors border border-amber-200 text-sm">
              Request Bank Change
            </button>
          )}
        </div>

        <div className="p-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-2">Banking Details</h3>
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase">Account Name</div>
                <div className="font-medium text-slate-900">{vendor.account_name || 'N/A'}</div>
              </div>
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase">Account Number / IBAN</div>
                <div className="font-mono text-slate-900">{vendor.account_number || 'N/A'}</div>
              </div>
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase">SWIFT / BIC</div>
                <div className="font-mono text-slate-900">{vendor.swift_bic || 'N/A'}</div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-2">Risk Profile</h3>
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase">Trust Score</div>
                <div className="font-medium text-emerald-600">{vendor.trusted_score} / 100</div>
              </div>
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase">Verification Status</div>
                <div className="font-medium text-slate-900 uppercase">{vendor.verification_status}</div>
              </div>
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase">Created At</div>
                <div className="font-medium text-slate-900">{new Date(vendor.created_at).toLocaleDateString()}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden my-8">
            <div className="p-6 border-b border-slate-100 flex items-center gap-2">
              <ShieldAlert className="text-amber-500" />
              <h2 className="text-xl font-bold">Request Bank Change</h2>
            </div>
            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              <p className="text-sm text-slate-600 mb-4">Editing verified bank details requires Controller or CFO approval. The vendor will remain active using the old details until the change is authorized.</p>
              
              <div><label className="block text-sm font-bold text-slate-700 mb-1">New Account Name</label><input name="account_name" defaultValue={vendor.account_name} className="w-full border p-2 rounded" /></div>
              <div><label className="block text-sm font-bold text-slate-700 mb-1">New Account Number / IBAN</label><input required name="account_number" defaultValue={vendor.account_number} className="w-full border p-2 rounded font-mono" /></div>
              <div><label className="block text-sm font-bold text-slate-700 mb-1">New SWIFT / BIC</label><input name="swift_bic" defaultValue={vendor.swift_bic} className="w-full border p-2 rounded font-mono" /></div>
              
              <div>
                <label className="block text-sm font-bold text-red-700 mb-1 mt-4">Reason for Change</label>
                <textarea required name="reason" rows={3} placeholder="e.g. Received verified W-9 from vendor via phone call" className="w-full border p-2 rounded focus:border-red-500 focus:ring-red-500" />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" disabled={isSubmitting} className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded">{isSubmitting ? 'Submitting...' : 'Submit for Approval'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
