"use client";
import { useState, useEffect } from "react";
import { Plus, Loader2, ExternalLink, Building2 } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { ROLES } from "@/lib/roles";
import { COUNTRIES, CURRENCIES } from "@/lib/constants";
import DataFilters, { FilterConfig } from "@/components/DataFilters";

export default function VendorsPage() {
  const [vendors, setVendors] = useState<any[]>([]);
  const [filteredVendors, setFilteredVendors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const fetchData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: userData } = await supabase.from('users').select('role').eq('id', session.user.id).single();
          setUserRole(userData?.role || "");
        }

        const cacheBuster = new Date().getTime();
        const res = await fetch(`/api/vendors?t=${cacheBuster}`, { cache: 'no-store' });
        const json = await res.json();
        
        if (json.success) {
          setVendors(json.data);
          setFilteredVendors(json.data);
        }
      } catch (err) {} finally { setIsLoading(false); }
    };
    fetchData();
  }, []);

  const handleNewVendor = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const payload = Object.fromEntries(formData.entries());
    
    try {
      const res = await fetch('/api/vendors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await res.json();
      if (result.success) {
        const newData = [...vendors, result.data].sort((a,b) => a.name.localeCompare(b.name));
        setVendors(newData);
        setFilteredVendors(newData);
        setIsModalOpen(false);
        alert("Vendor added successfully!");
      } else { alert("Error: " + result.error); }
    } catch (err) { alert("Failed to connect to server."); } finally { setIsSubmitting(false); }
  };

  const filterConfig: FilterConfig = {
    searchPlaceholder: "Search vendor name, account, or SWIFT...",
    searchKeys: ['name', 'account_number', 'swift_bic'],
    statuses: [
      { label: 'Active', value: 'active' },
      { label: 'Inactive', value: 'inactive' },
    ],
    sortOptions: [
      { label: 'Vendor A-Z', value: 'vendor_a_z' },
      { label: 'Newest First', value: 'newest' },
      { label: 'Oldest First', value: 'oldest' }
    ]
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto mt-10 px-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Building2 size={24}/> Vendor Management</h1>
          <p className="text-slate-500 text-sm mt-1">Manage trusted vendor master data and banking records.</p>
        </div>
        {userRole === ROLES.CLERK && (
          <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-colors">
            <Plus size={18} /> Add New Vendor
          </button>
        )}
      </div>

      <DataFilters data={vendors} config={filterConfig} onFilterChange={setFilteredVendors} />

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
              <tr><th className="px-6 py-4">Vendor Name</th><th className="px-6 py-4">Account Number</th><th className="px-6 py-4">SWIFT / BIC</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500"><Loader2 className="w-6 h-6 animate-spin mx-auto"/></td></tr> : 
               filteredVendors.length === 0 ? <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">No vendors match criteria.</td></tr> : 
               filteredVendors.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">{v.name}</td>
                  <td className="px-6 py-4 font-mono text-slate-500">{v.account_number ? `*${v.account_number.slice(-4)}` : 'N/A'}</td>
                  <td className="px-6 py-4 font-mono text-slate-500">{v.swift_bic || 'N/A'}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${v.status === 'active' || !v.status ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'}`}>
                      {v.status || 'active'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/vendors/${v.id}`} className="text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1">
                      View Profile <ExternalLink size={12}/>
                    </Link>
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
            <div className="p-6 border-b border-slate-100"><h2 className="text-xl font-bold">Add Trusted Vendor</h2></div>
            <form onSubmit={handleNewVendor} className="p-6 space-y-4">
              <div><label className="block text-sm font-bold text-slate-700 mb-1">Company / Vendor Name</label><input required name="name" className="w-full border p-2 rounded" /></div>
              <div><label className="block text-sm font-bold text-slate-700 mb-1">Account Name</label><input required name="account_name" className="w-full border p-2 rounded" /></div>
              <div><label className="block text-sm font-bold text-slate-700 mb-1">IBAN / Account Number</label><input required name="account_number" className="w-full border p-2 rounded font-mono" /></div>
              <div><label className="block text-sm font-bold text-slate-700 mb-1">SWIFT / BIC (Optional)</label><input name="swift_bic" className="w-full border p-2 rounded font-mono uppercase" /></div>
              
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-bold text-slate-700 mb-1">Country</label><select required name="country" defaultValue="US" className="w-full border p-2 rounded bg-slate-50 text-sm font-medium">
                  {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
                </select></div>
                <div><label className="block text-sm font-bold text-slate-700 mb-1">Currency</label><select required name="currency" defaultValue="USD" className="w-full border p-2 rounded bg-slate-50 text-sm font-medium">
                  {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code} - {c.name}</option>)}
                </select></div>
              </div>

              <div><label className="block text-sm font-bold text-slate-700 mb-1">Contact Email (Optional)</label><input type="email" name="contact_email" className="w-full border p-2 rounded" /></div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white px-4 py-2 rounded">{isSubmitting ? 'Saving...' : 'Save Vendor'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
