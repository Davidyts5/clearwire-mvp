"use client";

import { useState, useEffect } from "react";
import { Building2, ArrowLeft, Loader2, AlertTriangle, ShieldCheck, Edit, UploadCloud } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { ROLES } from "@/lib/roles";

export default function VendorProfile({ params }: { params: { id: string } }) {
  const [status, setStatus] = useState<string>("loading");
  const [vendor, setVendor] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("");

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [documentFile, setDocumentFile] = useState<File | null>(null);

  useEffect(() => {
    const fetchVendor = async () => {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: userData } = await supabase.from('users').select('role').eq('id', session.user.id).single();
          setUserRole(userData?.role || "");
        }

        const cacheBuster = new Date().getTime();
        const res = await fetch(`/api/vendors/${params.id}?t=${cacheBuster}`, { cache: 'no-store' });
        const json = await res.json();
        
        if (!json.success) return setStatus("not_found");
        
        setVendor(json.data);
        setStatus("success");
      } catch (err) {
        setStatus("error");
      }
    };
    fetchVendor();
  }, [params.id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) { alert("File must be smaller than 2MB."); e.target.value = ''; return; }
      setDocumentFile(file);
    }
  };

  const handleSubmitChange = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const formData = new FormData(e.currentTarget);
    if (documentFile) formData.set("document", documentFile);

    try {
      const res = await fetch(`/api/vendors/${params.id}`, { method: 'POST', body: formData });
      const result = await res.json();
      if (result.success) {
        alert("Vendor Change Request submitted successfully! Awaiting Controller approval.");
        setIsEditModalOpen(false);
      } else {
        alert("Error: " + result.error);
      }
    } catch (err) {
      alert("Failed to submit request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === "loading") return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-blue-500" size={32} /></div>;
  if (status === "not_found" || status === "error" || !vendor) {
    return (
      <div className="max-w-4xl mx-auto mt-10 px-4 text-center">
        <AlertTriangle size={48} className="mx-auto text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-red-600 mb-2">Vendor Not Found</h1>
        <p className="text-slate-500 mb-6">The vendor profile could not be found or you do not have permission.</p>
        <Link href="/vendors" className="text-blue-600 hover:underline">← Back to Vendors</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto mt-10 px-4 space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <Link href="/vendors" className="text-slate-500 hover:text-slate-800 flex items-center gap-1 text-sm font-medium w-fit">
          <ArrowLeft size={16} /> Back to Vendor Directory
        </Link>
        {userRole === ROLES.CLERK && vendor.status !== 'restricted' && (
          <button onClick={() => setIsEditModalOpen(true)} className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm">
            <Edit size={16} /> Request Vendor Change
          </button>
        )}
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
              <Building2 size={32} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{vendor.name}</h1>
              <p className="text-slate-500 font-medium">Internal ID: <span className="font-mono text-xs">{vendor.id}</span></p>
              <div className="mt-3 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wide">
                  <ShieldCheck size={14} /> {vendor.status || 'Active'}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-0">
          <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
            <div className="p-6 space-y-6 bg-slate-50/50">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Banking Details</h2>
              <div><p className="text-sm font-medium text-slate-500 mb-1">Account Name</p><p className="text-lg font-bold text-slate-900">{vendor.account_name || "N/A"}</p></div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Account Number / IBAN</p>
                <div className="bg-slate-100 border border-slate-200 p-3 rounded-lg font-mono text-slate-800 font-semibold">{vendor.account_number || "N/A"}</div>
              </div>
              <div><p className="text-sm font-medium text-slate-500 mb-1">SWIFT / BIC</p><p className="font-mono text-lg font-bold text-slate-900">{vendor.swift_bic || "N/A"}</p></div>
              <div><p className="text-sm font-medium text-slate-500 mb-1">Payment Instructions</p><p className="text-sm text-slate-800 bg-white p-3 rounded border border-slate-200">{vendor.payment_instructions || "None"}</p></div>
            </div>
            
            <div className="p-6 space-y-6">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Demographics & Contact</h2>
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-sm font-medium text-slate-500 mb-1">Country</p><p className="text-lg font-bold text-slate-900 uppercase">{vendor.country || "N/A"}</p></div>
                <div><p className="text-sm font-medium text-slate-500 mb-1">Currency</p><p className="text-lg font-bold text-slate-900 uppercase">{vendor.currency || "N/A"}</p></div>
              </div>
              <div><p className="text-sm font-medium text-slate-500 mb-1">Contact Email</p><p className="text-base font-semibold text-slate-800">{vendor.contact_email || "N/A"}</p></div>
              <div><p className="text-sm font-medium text-slate-500 mb-1">Address</p><p className="text-sm text-slate-800 bg-slate-50 p-3 rounded border border-slate-100 whitespace-pre-wrap">{vendor.address || "N/A"}</p></div>

              <div className="pt-6 border-t border-slate-100">
                <p className="text-xs text-slate-400 italic">Vendor modifications and version history require Controller authorization. Current module provides read-only access for Accounts Payable.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95">
            <div className="p-6 border-b border-slate-100 flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><Edit size={20} /></div>
              <div>
                <h2 className="text-xl font-bold">Request Vendor Change</h2>
                <p className="text-sm text-slate-500">Submit new details for authorization. Current details remain active until approved.</p>
              </div>
            </div>
            
            <form onSubmit={handleSubmitChange} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <h3 className="text-sm font-bold text-amber-800 uppercase mb-2">Required: Reason for Change</h3>
                <textarea required name="reason" rows={2} className="w-full border p-2 rounded bg-white" placeholder="e.g., Vendor emailed new banking details on 07/01/2026." />
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-bold text-slate-900 border-b pb-2">Identity & Contact</h3>
                  <div><label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Vendor Name</label><input required name="name" defaultValue={vendor.name} className="w-full border p-2 rounded text-sm" /></div>
                  <div><label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Contact Email</label><input type="email" name="contact_email" defaultValue={vendor.contact_email} className="w-full border p-2 rounded text-sm" /></div>
                  <div><label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Address</label><textarea name="address" defaultValue={vendor.address} className="w-full border p-2 rounded text-sm" rows={2} /></div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="font-bold text-slate-900 border-b pb-2">Banking Details</h3>
                  <div><label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Beneficiary / Account Name</label><input name="account_name" defaultValue={vendor.account_name} className="w-full border p-2 rounded text-sm" /></div>
                  <div><label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Bank Account / IBAN</label><input required name="account_number" defaultValue={vendor.account_number} className="w-full border p-2 rounded font-mono text-sm" /></div>
                  <div><label className="block text-xs font-bold text-slate-700 mb-1 uppercase">SWIFT / BIC</label><input name="swift_bic" defaultValue={vendor.swift_bic} className="w-full border p-2 rounded font-mono text-sm uppercase" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Country</label><input required name="country" defaultValue={vendor.country} className="w-full border p-2 rounded uppercase text-sm" maxLength={2} /></div>
                    <div><label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Currency</label><input required name="currency" defaultValue={vendor.currency} className="w-full border p-2 rounded uppercase text-sm" maxLength={3} /></div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Payment Instructions</label>
                <textarea name="payment_instructions" defaultValue={vendor.payment_instructions} className="w-full border p-2 rounded text-sm" rows={2} placeholder="e.g. Include invoice number in memo." />
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mt-4">
                <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-2"><UploadCloud size={16}/> Supporting Document (Optional)</label>
                <p className="text-xs text-slate-500 mb-2">Upload a letterhead, voided check, or email proof of the change.</p>
                <input type="file" accept=".pdf,.png,.jpg" onChange={handleFileChange} className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
              </div>

              <div className="flex justify-end gap-3 pt-6">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 font-medium text-slate-600 hover:text-slate-900">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="bg-slate-900 text-white px-6 py-2 rounded-lg font-medium shadow-sm flex items-center gap-2">
                  {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : 'Submit for Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
