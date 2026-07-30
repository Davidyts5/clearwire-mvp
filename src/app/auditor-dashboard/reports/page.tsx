"use client";
import { useState } from "react";
import { FileText, Loader2 } from "lucide-react";

export default function ReportsPage() {
  const [reportStart, setReportStart] = useState('');
  const [reportEnd, setReportEnd] = useState('');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const handleGenerateReport = async (e: any) => {
    e.preventDefault();
    setIsGeneratingReport(true);
    try {
      const res = await fetch('/api/audit/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          startDate: reportStart ? new Date(reportStart).toISOString() : new Date().toISOString(), 
          endDate: reportEnd ? new Date(reportEnd).toISOString() : new Date().toISOString() 
        })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to generate report");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compliance-report-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-20">
      <div>
        <div className="flex items-center gap-2 text-blue-600 mb-2 font-bold uppercase tracking-wider text-xs">
          <FileText size={16} /> Auditor Dashboard
        </div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Compliance Reports</h1>
        <p className="text-slate-500 mt-1">Generate tamper-evident PDF reports for external audits and compliance.</p>
      </div>

      <div className="max-w-md bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold flex items-center gap-2">Generate Report</h2>
        </div>
        <form onSubmit={handleGenerateReport} className="p-6 space-y-4 bg-slate-50/50">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Start Date</label>
            <input type="date" required value={reportStart} onChange={e => setReportStart(e.target.value)} className="w-full border border-slate-200 p-2.5 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">End Date</label>
            <input type="date" required value={reportEnd} onChange={e => setReportEnd(e.target.value)} className="w-full border border-slate-200 p-2.5 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white" />
          </div>
          <div className="pt-4 mt-4 border-t border-slate-200">
            <button type="submit" disabled={isGeneratingReport} className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-bold text-sm shadow-sm flex items-center justify-center gap-2 transition-colors">
              {isGeneratingReport ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
              {isGeneratingReport ? "Generating WORM PDF..." : "Download Compliance PDF"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}