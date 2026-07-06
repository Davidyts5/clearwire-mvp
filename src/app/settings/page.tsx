"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, Settings, Loader2, Save, TrendingUp, AlertTriangle, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { ROLES } from "@/lib/roles";

export default function SecuritySettings() {
  const [userRole, setUserRole] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Original setting
  const [limit, setLimit] = useState<number>(10000);

  // New Risk Engine settings
  const [riskProfile, setRiskProfile] = useState<string>("standard");
  const [freezeFirstPayment, setFreezeFirstPayment] = useState<boolean>(false);
  const [freezeBankChanges, setFreezeBankChanges] = useState<boolean>(false);
  const [freezeInternational, setFreezeInternational] = useState<boolean>(false);
  const [freezeMissingInvoice, setFreezeMissingInvoice] = useState<boolean>(false);
  const [freezeHighRiskCountries, setFreezeHighRiskCountries] = useState<boolean>(false);
  const [freezeAboveAmount, setFreezeAboveAmount] = useState<boolean>(false);
  const [freezeAmountThreshold, setFreezeAmountThreshold] = useState<number>(0);
  const [vendorAuthPolicy, setVendorAuthPolicy] = useState<string>("controller_any");

  useEffect(() => {
    const fetchSettingsAndRole = async () => {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: userData } = await supabase.from('users').select('role').eq('id', session.user.id).single();
          setUserRole(userData?.role || "");
        }

        const cacheBuster = new Date().getTime();
        const res = await fetch(`/api/settings?t=${cacheBuster}`, { cache: 'no-store' });
        const json = await res.json();
        
        if (json.success && json.data) {
          const d = json.data;
          if (d.approval_tiers?.tier1?.max) setLimit(d.approval_tiers.tier1.max);
          if (d.risk_profile) setRiskProfile(d.risk_profile);
          if (d.freeze_first_payment !== null) setFreezeFirstPayment(d.freeze_first_payment);
          if (d.freeze_bank_changes !== null) setFreezeBankChanges(d.freeze_bank_changes);
          if (d.freeze_international_payment !== null) setFreezeInternational(d.freeze_international_payment);
          if (d.freeze_missing_invoice !== null) setFreezeMissingInvoice(d.freeze_missing_invoice);
          if (d.freeze_high_risk_countries !== null) setFreezeHighRiskCountries(d.freeze_high_risk_countries);
          if (d.freeze_above_amount !== null) setFreezeAboveAmount(d.freeze_above_amount);
          if (d.freeze_amount_threshold !== null) setFreezeAmountThreshold(d.freeze_amount_threshold);
          if (d.vendor_auth_policy) setVendorAuthPolicy(d.vendor_auth_policy);
        }
      } catch (err) {
        console.error("Failed to load settings", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettingsAndRole();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole !== ROLES.CFO) return;
    setIsSaving(true);
    
    try {
      const payload = {
        controller_limit: Number(limit),
        risk_profile: riskProfile,
        freeze_first_payment: freezeFirstPayment,
        freeze_bank_changes: freezeBankChanges,
        freeze_international_payment: freezeInternational,
        freeze_missing_invoice: freezeMissingInvoice,
        freeze_high_risk_countries: freezeHighRiskCountries,
        freeze_above_amount: freezeAboveAmount,
        freeze_amount_threshold: Number(freezeAmountThreshold),
        vendor_auth_policy: vendorAuthPolicy
      };

      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      
      if (json.success) {
        alert("Security Policy updated successfully.");
      } else {
        alert(json.error);
      }
    } catch (err) {
      alert("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const isReadOnly = userRole !== ROLES.CFO;

  return (
    <div className="max-w-4xl mx-auto mt-10 px-4 sm:px-6 lg:px-8 space-y-6 pb-20">
      <div className="bg-slate-900 text-white p-6 rounded-xl flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <Settings size={32} className="text-blue-400" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Security & Policy Engine</h1>
            <p className="text-slate-400 text-sm">Configure multi-signature and approval matrices</p>
          </div>
        </div>
      </div>

      {isReadOnly && !isLoading && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-start gap-3">
          <ShieldCheck className="text-blue-600 mt-0.5" size={20} />
          <div>
            <h3 className="font-bold text-blue-900">Read-Only Access</h3>
            <p className="text-sm text-blue-800">You are viewing the global security policies. Only the CFO is authorized to modify these settings.</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Global Controller Default Limit Section */}
        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
            <TrendingUp className="text-emerald-500" size={24} />
            <h2 className="text-xl font-bold text-slate-900">Global Controller Default Limit</h2>
          </div>
          
          <div className="mb-6">
            <p className="text-slate-600 text-sm mb-4">
              Set the <strong>default</strong> maximum dollar amount new Controllers are allowed to cryptographically sign. This limit can be overridden per-user in the Team Management tab.
            </p>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-900 mb-2">Default Maximum Wire Amount (USD)</label>
            {isLoading ? (
              <div className="h-12 bg-slate-100 rounded-lg animate-pulse w-full max-w-xs"></div>
            ) : (
              <div className="relative max-w-xs">
                <span className="absolute left-4 top-3 text-slate-500 font-bold">$</span>
                <input 
                  type="number" 
                  min="0"
                  step="1"
                  value={limit} 
                  onChange={(e) => setLimit(Number(e.target.value))} 
                  disabled={isReadOnly}
                  className="w-full pl-8 pr-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:ring-blue-500 outline-none text-lg font-mono font-semibold text-slate-900 disabled:bg-slate-50 disabled:text-slate-500" 
                />
              </div>
            )}
          </div>
        </div>

        {/* Risk Engine Controls Section */}
        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
            <ShieldAlert className="text-amber-500" size={24} />
            <h2 className="text-xl font-bold text-slate-900">Risk Engine Configuration</h2>
          </div>

          <div className="mb-6">
            <p className="text-slate-600 text-sm">
              Define the global fraud detection strictness. The Risk Engine analyzes every wire request dynamically and enforces freezing policies based on these settings.
            </p>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              <div className="h-12 bg-slate-100 rounded-lg animate-pulse w-full"></div>
              <div className="h-32 bg-slate-100 rounded-lg animate-pulse w-full"></div>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-3">Active Risk Profile</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {['conservative', 'standard', 'aggressive', 'custom'].map((profile) => (
                    <label key={profile} className={`flex items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all ${riskProfile === profile ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-slate-200 hover:border-slate-300 text-slate-600'} ${isReadOnly ? 'opacity-75 cursor-not-allowed' : ''}`}>
                      <input 
                        type="radio" 
                        name="riskProfile" 
                        value={profile} 
                        checked={riskProfile === profile} 
                        onChange={() => setRiskProfile(profile)} 
                        disabled={isReadOnly}
                        className="sr-only" 
                      />
                      <span className="font-bold capitalize">{profile}</span>
                    </label>
                  ))}
                </div>
              </div>

              {riskProfile === 'custom' && (
                <div className="bg-slate-50 border border-slate-200 p-6 rounded-xl space-y-4 animate-in fade-in slide-in-from-top-2">
                  <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">Custom Freezing Rules</h3>
                  
                  <div className="space-y-3">
                    <label className={`flex items-center gap-3 ${isReadOnly ? 'opacity-75' : 'cursor-pointer'}`}>
                      <input type="checkbox" checked={freezeFirstPayment} onChange={(e) => setFreezeFirstPayment(e.target.checked)} disabled={isReadOnly} className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                      <span className="font-medium text-slate-700">Freeze first payment to a new vendor</span>
                    </label>

                    <label className={`flex items-center gap-3 ${isReadOnly ? 'opacity-75' : 'cursor-pointer'}`}>
                      <input type="checkbox" checked={freezeBankChanges} onChange={(e) => setFreezeBankChanges(e.target.checked)} disabled={isReadOnly} className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                      <span className="font-medium text-slate-700">Freeze bank account changes</span>
                    </label>

                    <label className={`flex items-center gap-3 ${isReadOnly ? 'opacity-75' : 'cursor-pointer'}`}>
                      <input type="checkbox" checked={freezeInternational} onChange={(e) => setFreezeInternational(e.target.checked)} disabled={isReadOnly} className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                      <span className="font-medium text-slate-700">Freeze international payments</span>
                    </label>

                    <label className={`flex items-center gap-3 ${isReadOnly ? 'opacity-75' : 'cursor-pointer'}`}>
                      <input type="checkbox" checked={freezeMissingInvoice} onChange={(e) => setFreezeMissingInvoice(e.target.checked)} disabled={isReadOnly} className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                      <span className="font-medium text-slate-700">Freeze missing invoice</span>
                    </label>

                    <label className={`flex items-center gap-3 ${isReadOnly ? 'opacity-75' : 'cursor-pointer'}`}>
                      <input type="checkbox" checked={freezeHighRiskCountries} onChange={(e) => setFreezeHighRiskCountries(e.target.checked)} disabled={isReadOnly} className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                      <span className="font-medium text-slate-700">Freeze high-risk countries</span>
                    </label>

                    <div className="pt-2">
                      <label className={`flex items-center gap-3 ${isReadOnly ? 'opacity-75' : 'cursor-pointer'}`}>
                        <input type="checkbox" checked={freezeAboveAmount} onChange={(e) => setFreezeAboveAmount(e.target.checked)} disabled={isReadOnly} className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                        <span className="font-medium text-slate-700">Freeze payments above a configurable amount</span>
                      </label>
                      
                      {freezeAboveAmount && (
                        <div className="ml-8 mt-3 relative max-w-xs animate-in zoom-in-95">
                          <span className="absolute left-3 top-2.5 text-slate-500 font-bold">$</span>
                          <input 
                            type="number" 
                            min="0"
                            step="0.01"
                            value={freezeAmountThreshold} 
                            onChange={(e) => setFreezeAmountThreshold(Number(e.target.value))} 
                            disabled={isReadOnly}
                            className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg focus:border-blue-500 outline-none text-sm font-mono font-medium disabled:bg-slate-100 disabled:text-slate-500" 
                            placeholder="Amount Threshold"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Vendor Authorization Policy Section */}
        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
            <ShieldCheck className="text-blue-500" size={24} />
            <h2 className="text-xl font-bold text-slate-900">Vendor Authorization Policy</h2>
          </div>

          <div className="mb-6">
            <p className="text-slate-600 text-sm">
              Configure who can approve vendor profile and banking changes.
            </p>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              <div className="h-16 bg-slate-100 rounded-lg animate-pulse w-full"></div>
              <div className="h-16 bg-slate-100 rounded-lg animate-pulse w-full"></div>
            </div>
          ) : (
            <div className="space-y-3">
              <label className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${vendorAuthPolicy === 'controller_any' ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-300'} ${isReadOnly ? 'opacity-75 cursor-not-allowed' : ''}`}>
                <input type="radio" name="vendorAuthPolicy" value="controller_any" checked={vendorAuthPolicy === 'controller_any'} onChange={() => setVendorAuthPolicy('controller_any')} disabled={isReadOnly} className="mt-1" />
                <div>
                  <div className="font-bold text-slate-900 text-sm">Controllers may approve all vendor changes.</div>
                </div>
              </label>
              
              <label className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${vendorAuthPolicy === 'cfo_bank_only' ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-300'} ${isReadOnly ? 'opacity-75 cursor-not-allowed' : ''}`}>
                <input type="radio" name="vendorAuthPolicy" value="cfo_bank_only" checked={vendorAuthPolicy === 'cfo_bank_only'} onChange={() => setVendorAuthPolicy('cfo_bank_only')} disabled={isReadOnly} className="mt-1" />
                <div>
                  <div className="font-bold text-slate-900 text-sm">Controllers may approve profile changes only. Bank account changes require CFO approval.</div>
                </div>
              </label>
              
              <label className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${vendorAuthPolicy === 'cfo_always' ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-300'} ${isReadOnly ? 'opacity-75 cursor-not-allowed' : ''}`}>
                <input type="radio" name="vendorAuthPolicy" value="cfo_always" checked={vendorAuthPolicy === 'cfo_always'} onChange={() => setVendorAuthPolicy('cfo_always')} disabled={isReadOnly} className="mt-1" />
                <div>
                  <div className="font-bold text-slate-900 text-sm">Controllers review only. All vendor changes require CFO approval.</div>
                </div>
              </label>
            </div>
          )}
        </div>



        {!isReadOnly && (
          <div className="flex justify-end pt-4">
            <button 
              type="submit" 
              disabled={isSaving || isLoading} 
              className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-md w-full sm:w-auto"
            >
              {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Save All Policy Rules
            </button>
          </div>
        )}

      </form>
    </div>
  );
}
