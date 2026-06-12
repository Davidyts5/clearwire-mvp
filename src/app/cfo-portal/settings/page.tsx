"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, Settings, Loader2, Save, TrendingUp, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function SecuritySettings() {
  const [limit, setLimit] = useState<number>(10000);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        const json = await res.json();
        if (json.success && json.data.approval_tiers?.tier1?.max) {
          setLimit(json.data.approval_tiers.tier1.max);
        }
      } catch (err) {
        console.error("Failed to load settings");
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ controller_limit: Number(limit) })
      });
      const json = await res.json();
      
      if (json.success) {
        alert("Approval Matrix updated successfully.");
      } else {
        alert(json.error);
      }
    } catch (err) {
      alert("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto mt-10 px-4 sm:px-6 lg:px-8 space-y-6">
      <div className="bg-slate-900 text-white p-6 rounded-xl flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <Settings size={32} className="text-blue-400" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Security & Policy Engine</h1>
            <p className="text-slate-400 text-sm">Configure multi-signature and approval matrices</p>
          </div>
        </div>
        <Link href="/cfo-portal" className="text-sm font-medium text-slate-300 hover:text-white underline">
          &larr; Back to Portal
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <div className="md:col-span-2 bg-white p-6 sm:p-8 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
            <TrendingUp className="text-emerald-500" size={24} />
            <h2 className="text-xl font-bold text-slate-900">Controller Approval Limits</h2>
          </div>
          
          <div className="mb-6">
            <p className="text-slate-600 text-sm mb-4">
              Set the maximum dollar amount a <strong>Controller</strong> is allowed to cryptographically sign without requiring CFO intervention. Any wire above this limit will require your direct FaceID authorization.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3 text-sm text-blue-800">
              <ShieldCheck className="shrink-0 text-blue-600" size={20} />
              <p>For maximum security, limit day-to-day AP controllers to $10,000 or $50,000. Set to $0 to force all wires to require CFO approval.</p>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-2">Maximum Wire Amount (USD)</label>
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
                    className="w-full pl-8 pr-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:ring-blue-500 outline-none text-lg font-mono font-semibold text-slate-900" 
                  />
                </div>
              )}
            </div>

            <button 
              type="submit" 
              disabled={isSaving || isLoading} 
              className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Save Policy Rules
            </button>
          </form>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
            <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
              <AlertTriangle className="text-amber-500" size={18} />
              Risk Engine Freeze
            </h3>
            <p className="text-sm text-slate-600">
              Regardless of the dollar amount set here, if our Risk Engine detects extreme anomalies (e.g. Bank Account Change + International Destination), the transaction will be frozen and escalated directly to the CFO.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
