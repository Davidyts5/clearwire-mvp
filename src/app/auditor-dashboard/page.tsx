'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Download, Loader2, ShieldCheck } from 'lucide-react';
import { exceptionsToCsv, type ComplianceException } from '@/lib/compliance-exceptions';

export default function AuditorDashboard() {
  const [exceptions, setExceptions] = useState<ComplianceException[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);
    fetch('/api/audit/exceptions', { cache: 'no-store', signal: controller.signal })
      .then(async response => {
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || 'Unable to load exceptions.');
        setExceptions(result.data);
      })
      .catch(err => {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Unable to load exceptions.');
      })
      .finally(() => { if (!controller.signal.aborted) setIsLoading(false); });
    return () => controller.abort();
  }, [reload]);

  function exportCsv() {
    const url = URL.createObjectURL(new Blob([exceptionsToCsv(exceptions)], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `clearwire-exceptions-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 pb-20 sm:px-6 lg:px-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600"><ShieldCheck size={16} /> Compliance Hub</p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Exceptions &amp; Anomalies</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">Focus on approved high-risk wires and wires created within seven days of an approved vendor change.</p>
        </div>
        <button onClick={exportCsv} disabled={isLoading || !!error || exceptions.length === 0} className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40">
          <Download size={16} /> Export Exceptions (CSV)
        </button>
      </header>

      <section aria-label="Compliance exceptions" className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4 text-sm font-semibold text-slate-700">
          <AlertTriangle size={17} className="text-red-600" />
          {isLoading ? 'Loading exceptions…' : error ? 'Exceptions unavailable' : `${exceptions.length} ${exceptions.length === 1 ? 'wire' : 'wires'} to review`}
        </div>
        {isLoading ? (
          <div role="status" className="flex items-center justify-center gap-2 p-16 text-slate-500"><Loader2 className="animate-spin" size={20} /> Loading exceptions…</div>
        ) : error ? (
          <div role="alert" className="space-y-3 p-10 text-center text-red-700"><p>{error}</p><button onClick={() => setReload(value => value + 1)} className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold">Try again</button></div>
        ) : exceptions.length === 0 ? (
          <div className="p-16 text-center"><ShieldCheck className="mx-auto mb-3 text-emerald-600" size={28} /><h2 className="font-semibold text-slate-900">No exceptions found</h2><p className="mt-1 text-sm text-slate-500">No wires currently meet either exception criterion.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{['Wire ID', 'Vendor', 'Amount', 'Date', 'Exception'].map(label => <th key={label} scope="col" className="px-5 py-3 font-semibold">{label}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100">{exceptions.map(wire => (
                <tr key={wire.id} className="align-top hover:bg-slate-50/60">
                  <td className="px-5 py-4"><Link className="font-mono text-xs text-blue-700 underline decoration-blue-200 underline-offset-4" href={`/auditor-dashboard/ledger?wireId=${encodeURIComponent(wire.id)}`}>{wire.id}</Link></td>
                  <td className="px-5 py-4 font-medium text-slate-900">{wire.vendor_name_snapshot || 'Unknown vendor'}</td>
                  <td className="whitespace-nowrap px-5 py-4 tabular-nums text-slate-700">{Number(wire.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {wire.currency}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500"><time dateTime={wire.created_at} title={new Date(wire.created_at).toLocaleString()}>{new Date(wire.created_at).toLocaleDateString()}</time></td>
                  <td className="min-w-[280px] space-y-2 px-5 py-4">{wire.reasons.map(reason => <span key={reason} className="block w-fit rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">{reason}</span>)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
      <p className="text-xs text-slate-500">Review signals, not fraud findings. High risk means a score of 70 or above. Vendor changes are matched by approval time before wire creation, regardless of wire status.</p>
    </div>
  );
}
