"use client";

import { useState, useEffect } from "react";
import { Building2, ArrowLeft, Loader2, AlertTriangle, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

export default function VendorProfile({ params }: { params: { id: string } }) {
  const [status, setStatus] = useState<string>("loading");
  const [vendor, setVendor] = useState<any>(null);

  useEffect(() => {
    const fetchVendor = async () => {
      try {
        const cacheBuster = new Date().getTime();
        const res = await fetch(`/api/vendors/${params.id}?t=${cacheBuster}`, { cache: 'no-store' });
        const json = await res.json();
        
        if (!json.success) {
          return setStatus("not_found");
        }
        
        setVendor(json.data);
        setStatus("success");
      } catch (err) {
        setStatus("error");
      }
    };
    
    fetchVendor();
  }, [params.id]);

  if (status === "loading") {
    return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-blue-500" size={32} /></div>;
  }

  if (status === "not_found" || status === "error" || !vendor) {
    return (
      <div className="max-w-4xl mx-auto mt-10 px-4 text-center">
        <AlertTriangle size={48} className="mx-auto text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-red-600 mb-2">Vendor Not Found</h1>
        <p className="text-slate-500 mb-6">The vendor profile you requested could not be found or you do not have permission.</p>
        <Link href="/vendors" className="text-blue-600 hover:underline">← Back to Vendors</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto mt-10 px-4 space-y-6">
      <Link href="/vendors" className="text-slate-500 hover:text-slate-800 flex items-center gap-1 text-sm font-medium w-fit mb-6">
        <ArrowLeft size={16} /> Back to Vendor Directory
      </Link>
      
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-start gap-4">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
            <Building2 size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{vendor.name}</h1>
            <p className="text-slate-500 font-medium">Internal ID: <span className="font-mono text-xs">{vendor.id}</span></p>
            <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wide">
              <ShieldCheck size={14} /> Active Vendor
            </div>
          </div>
        </div>
        
        <div className="p-0">
          <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
            <div className="p-6 space-y-6 bg-slate-50/50">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Banking Details</h2>
              
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Account Name</p>
                <p className="text-lg font-bold text-slate-900">{vendor.account_name || "N/A"}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Account Number / IBAN</p>
                <div className="bg-slate-100 border border-slate-200 p-3 rounded-lg font-mono text-slate-800 font-semibold flex justify-between items-center">
                  {vendor.account_number || "N/A"}
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">SWIFT / BIC</p>
                <p className="font-mono text-lg font-bold text-slate-900">{vendor.swift_bic || "N/A"}</p>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Demographics & Contact</h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">Country</p>
                  <p className="text-lg font-bold text-slate-900 uppercase">{vendor.country || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">Currency</p>
                  <p className="text-lg font-bold text-slate-900 uppercase">{vendor.currency || "N/A"}</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Contact Email</p>
                <p className="text-base font-semibold text-slate-800">{vendor.contact_email || "N/A"}</p>
              </div>

              <div className="pt-6 border-t border-slate-100">
                <p className="text-xs text-slate-400 italic">Vendor modifications and version history require Controller authorization. Current module provides read-only access for Accounts Payable.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
