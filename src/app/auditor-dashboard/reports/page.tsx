"use client";
import { useState } from "react";
import { FileText, Loader2, Download } from "lucide-react";

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
          endDate: reportEnd ? new Date(`${reportEnd}T23:59:59.999Z`).toISOString() : new Date().toISOString()
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
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
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
          <FileText size={16} /> Compliance Hub
        </div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Compliance Reports</h1>
        <p className="text-slate-500 mt-1">Generate a compliance report for a selected period. Integrity verification runs automatically during report generation.</p>
      </div>

      <div className="max-w-2xl">

        {/* Report generation includes backend verification. */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden opacity-100 transition-opacity">
          <div className="p-6 border-b border-slate-100 bg-slate-50">
            <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900">
              <FileText size={18} className="text-blue-500" /> Extract Compliance Report
            </h2>
          </div>

            <form onSubmit={handleGenerateReport} className="p-8 space-y-5">
              <p className="text-sm text-slate-600 mb-4">Select the specific date boundaries to export compliance evidence for this period.</p>

              <div className="space-y-4">
                <div>
                  <label htmlFor="report-start" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Start Date</label>
                  <input id="report-start" type="date" required value={reportStart} onChange={e => setReportStart(e.target.value)} className="w-full border border-slate-200 p-3 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50" />
                </div>
                <div>
                  <label htmlFor="report-end" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">End Date</label>
                  <input id="report-end" type="date" required min={reportStart} value={reportEnd} onChange={e => setReportEnd(e.target.value)} className="w-full border border-slate-200 p-3 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50" />
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-100">
                <button type="submit" disabled={isGeneratingReport} className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white px-6 py-4 rounded-xl font-bold shadow-md flex items-center justify-center gap-2 transition-colors">
                  {isGeneratingReport ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                  {isGeneratingReport ? "Generating report…" : "Download Compliance PDF"}
                </button>
              </div>
            </form>

        </div>

      </div>
    </div>
  );
}
