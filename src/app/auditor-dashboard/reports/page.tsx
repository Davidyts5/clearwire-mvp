"use client";
import { useState, useEffect } from "react";
import { FileText, Loader2, ShieldCheck, ShieldAlert, Fingerprint, Activity, Server, ArrowRight, Lock } from "lucide-react";

export default function ReportsPage() {
  const [reportStart, setReportStart] = useState('');
  const [reportEnd, setReportEnd] = useState('');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // Global Scan State
  const [isScanning, setIsScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanResults, setScanResults] = useState<{
    totalRecords: number;
    validCount: number;
    invalidCount: number;
    historicalPlaceholderCount: number;
    isTampered: boolean;
  } | null>(null);

  const runGlobalScan = async () => {
    setIsScanning(true);
    setScanComplete(false);
    setScanProgress(0);
    
    // Simulate UI progress for dramatic effect while the backend works
    const progressInterval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 90) return prev;
        return prev + Math.floor(Math.random() * 15) + 5;
      });
    }, 200);

    try {
      const res = await fetch('/api/audit/timeline/verify-all', { method: 'POST' });
      const json = await res.json();
      
      if (json.success) {
        clearInterval(progressInterval);
        setScanProgress(100);
        setTimeout(() => {
          setScanResults(json.data);
          setIsScanning(false);
          setScanComplete(true);
        }, 500); // Let them see 100% for a split second
      } else {
        throw new Error(json.error || "Scan failed");
      }
    } catch (err: any) {
      clearInterval(progressInterval);
      alert(err.message);
      setIsScanning(false);
    }
  };

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
        <p className="text-slate-500 mt-1">Verify cryptographic integrity and generate tamper-evident PDF reports for external audits.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 items-start">
        
        {/* Left Column: Global Integrity Scan */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900">
              <Server size={18} className="text-blue-500" /> WORM System Health
            </h2>
          </div>
          
          <div className="p-8">
            {!scanComplete ? (
              <div className="text-center py-10 space-y-6">
                <Fingerprint size={64} className={`mx-auto ${isScanning ? 'text-blue-500 animate-pulse' : 'text-slate-300'}`} />
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Verify Full Database Integrity</h3>
                  <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
                    Re-compute the SHA-256 hash chain for every immutable event across the entire lifetime of the workspace.
                  </p>
                </div>
                
                {isScanning ? (
                  <div className="max-w-xs mx-auto">
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 transition-all duration-300 ease-out" style={{ width: `${scanProgress}%` }}></div>
                    </div>
                    <div className="text-xs font-bold text-blue-600 mt-3 flex items-center justify-center gap-2">
                      <Loader2 size={12} className="animate-spin" /> Verifying Cryptographic Chain... {scanProgress}%
                    </div>
                  </div>
                ) : (
                  <button onClick={runGlobalScan} className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-lg font-bold shadow-md transition-all hover:scale-105 active:scale-95 flex items-center gap-2 mx-auto">
                    <Activity size={18} /> Run Full Integrity Scan
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <div className={`p-6 rounded-xl border flex flex-col items-center text-center ${scanResults?.isTampered ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
                  {scanResults?.isTampered ? (
                    <ShieldAlert size={48} className="text-red-500 mb-4" />
                  ) : (
                    <ShieldCheck size={48} className="text-emerald-500 mb-4" />
                  )}
                  <h3 className={`text-2xl font-bold mb-1 ${scanResults?.isTampered ? 'text-red-700' : 'text-emerald-700'}`}>
                    {scanResults?.isTampered ? 'Chain Integrity Failed!' : 'Chain Integrity Verified'}
                  </h3>
                  <p className={`text-sm ${scanResults?.isTampered ? 'text-red-600' : 'text-emerald-600'}`}>
                    {scanResults?.isTampered ? 'One or more records have been tampered with or corrupted.' : 'All hashes re-computed successfully. Zero anomalies detected.'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg text-center">
                    <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Records</span>
                    <span className="text-2xl font-bold font-mono text-slate-800">{scanResults?.totalRecords}</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg text-center">
                    <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Valid Hashes</span>
                    <span className="text-2xl font-bold font-mono text-emerald-600">{scanResults?.validCount}</span>
                  </div>
                  {scanResults && scanResults.historicalPlaceholderCount > 0 && (
                    <div className="col-span-2 bg-slate-50 border border-slate-200 p-4 rounded-lg text-center">
                      <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Historical Placeholders</span>
                      <span className="text-2xl font-bold font-mono text-slate-500">{scanResults?.historicalPlaceholderCount}</span>
                      <p className="text-[10px] text-slate-400 mt-2 max-w-xs mx-auto">These records predate the WORM chaining implementation and are excluded from the failure count.</p>
                    </div>
                  )}
                </div>
                
                <button onClick={() => setScanComplete(false)} className="w-full text-center text-sm font-medium text-slate-500 hover:text-slate-800 underline">
                  Run another scan
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: PDF Generator */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden opacity-100 transition-opacity">
          <div className="p-6 border-b border-slate-100 bg-slate-50">
            <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900">
              <FileText size={18} className="text-blue-500" /> Extract Compliance Report
            </h2>
          </div>
          
          {scanComplete && !scanResults?.isTampered ? (
            <form onSubmit={handleGenerateReport} className="p-8 space-y-5">
              <p className="text-sm text-slate-600 mb-4">Select the specific date boundaries to export certified evidence for this period.</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Start Date</label>
                  <input type="date" required value={reportStart} onChange={e => setReportStart(e.target.value)} className="w-full border border-slate-200 p-3 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">End Date</label>
                  <input type="date" required value={reportEnd} onChange={e => setReportEnd(e.target.value)} className="w-full border border-slate-200 p-3 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50" />
                </div>
              </div>
              
              <div className="pt-6 mt-6 border-t border-slate-100">
                <button type="submit" disabled={isGeneratingReport} className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white px-6 py-4 rounded-xl font-bold shadow-md flex items-center justify-center gap-2 transition-colors">
                  {isGeneratingReport ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                  {isGeneratingReport ? "Generating Encrypted PDF..." : "Download Certified PDF"}
                </button>
              </div>
            </form>
          ) : (
            <div className="p-8 text-center flex flex-col items-center justify-center h-[350px]">
              <Lock size={48} className="text-slate-200 mb-4" />
              <h3 className="text-lg font-bold text-slate-400 mb-2">Reports Locked</h3>
              <p className="text-sm text-slate-400 max-w-xs mx-auto">
                You must run a successful Global Integrity Scan to verify the database state before extracting certified WORM reports.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
