'use client';

import { useEffect, useMemo, useState } from 'react';
import { FileDigit, Loader2, Search, X } from 'lucide-react';
import { auditCategory, describeAuditEvent, type StoryEvent } from '@/lib/audit-story';

type LedgerEvent = StoryEvent & { id: string; created_at: string };
type Category = 'ALL' | ReturnType<typeof auditCategory>;
const categories: { id: Category; label: string }[] = [
  { id: 'ALL', label: 'All activity' }, { id: 'WIRE', label: 'Wires' },
  { id: 'VENDOR', label: 'Vendors' }, { id: 'SYSTEM', label: 'Policies & support' },
  { id: 'USER', label: 'People & devices' },
];

function Timeline({ events, onOpenWire }: { events: LedgerEvent[]; onOpenWire?: (id: string) => void }) {
  return <ol className="space-y-5">{events.map(event => (
    <li key={event.id} className="relative border-l-2 border-slate-200 pl-6">
      <span className="absolute -left-[6px] top-1.5 h-2.5 w-2.5 rounded-full bg-blue-500" />
      <p className="text-sm leading-6 text-slate-800">{describeAuditEvent(event)}</p>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
        <time dateTime={event.created_at}>{new Date(event.created_at).toLocaleString()}</time>
        {event.actor?.role && <span>{event.actor.role}</span>}
        {event.wire_id && onOpenWire && <button onClick={() => onOpenWire(event.wire_id!)} className="font-medium text-blue-700 underline underline-offset-2">View wire {event.wire_id.slice(0, 8)} history</button>}
      </div>
    </li>
  ))}</ol>;
}

export default function LedgerPage() {
  const [events, setEvents] = useState<LedgerEvent[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<Category>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [wireId, setWireId] = useState<string | null>(null);
  const [wireEvents, setWireEvents] = useState<LedgerEvent[]>([]);
  const [wireLoading, setWireLoading] = useState(false);
  const [wireError, setWireError] = useState<string | null>(null);

  useEffect(() => { setWireId(new URLSearchParams(window.location.search).get('wireId')); }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetch('/api/audit/timeline?limit=300', { cache: 'no-store', signal: controller.signal })
      .then(async response => {
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || 'Unable to load history.');
        setEvents(result.data || []);
      })
      .catch(err => { if (!controller.signal.aborted) setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [retry]);

  useEffect(() => {
    if (!wireId) return;
    const controller = new AbortController();
    setWireLoading(true);
    setWireError(null);
    setWireEvents([]);
    fetch(`/api/audit/timeline/${encodeURIComponent(wireId)}`, { cache: 'no-store', signal: controller.signal })
      .then(async response => {
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || 'Unable to load wire history.');
        setWireEvents(result.data || []); // API returns oldest first: a chronological story.
      })
      .catch(err => { if (!controller.signal.aborted) setWireError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setWireLoading(false); });
    return () => controller.abort();
  }, [wireId, retry]);

  const visible = useMemo(() => events.filter(event =>
    (category === 'ALL' || auditCategory(event) === category) &&
    `${describeAuditEvent(event)} ${event.wire_id || ''} ${event.actor?.full_name || ''}`.toLowerCase().includes(search.trim().toLowerCase())
  ), [events, category, search]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 pb-20 sm:px-6 lg:px-8">
      <header>
        <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600"><FileDigit size={16} /> Compliance Hub</p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">History &amp; Ledger</h1>
        <p className="mt-2 text-sm text-slate-500">The latest 300 recorded activities, in plain English. Open a wire to follow its history from the beginning.</p>
      </header>
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm" aria-label="Workspace history">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
          <div className="flex flex-wrap gap-1">{categories.map(item => <button key={item.id} aria-pressed={category === item.id} onClick={() => setCategory(item.id)} className={`rounded-md px-3 py-2 text-xs font-semibold ${category === item.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{item.label}</button>)}</div>
          <label className="relative sm:ml-auto"><span className="sr-only">Search history</span><Search size={16} className="absolute left-3 top-2.5 text-slate-400" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search activity, person or wire…" className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm sm:w-72" /></label>
        </div>
        <div className="p-6">
          {loading ? <p role="status" className="flex items-center gap-2 py-10 text-slate-500"><Loader2 size={20} className="animate-spin" /> Loading history…</p> : error ? <div role="alert" className="text-red-700"><p>{error}</p><button className="mt-2 underline" onClick={() => setRetry(n => n + 1)}>Try again</button></div> : visible.length ? <Timeline events={visible} onOpenWire={setWireId} /> : <p className="py-10 text-center text-sm text-slate-500">No activities match this view.</p>}
        </div>
      </section>
      {wireId && <dialog open onKeyDown={event => { if (event.key === 'Escape') setWireId(null); }} aria-labelledby="wire-history-title" className="fixed inset-y-0 right-0 left-auto z-40 m-0 h-full max-h-none w-full max-w-xl overflow-y-auto border-l border-slate-200 bg-white p-6 shadow-2xl">
        <header className="mb-6 flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div><h2 id="wire-history-title" className="text-xl font-bold text-slate-900">Wire history</h2><p className="mt-1 break-all font-mono text-xs text-slate-500">{wireId}</p><p className="mt-2 text-xs text-slate-500">Oldest activity first</p></div>
          <button autoFocus aria-label="Close wire history" onClick={() => setWireId(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={20} /></button>
        </header>
        {wireLoading ? <p role="status" className="flex items-center gap-2 text-slate-500"><Loader2 size={20} className="animate-spin" /> Loading wire history…</p> : wireError ? <div role="alert" className="text-red-700"><p>{wireError}</p><button onClick={() => setRetry(n => n + 1)} className="mt-2 underline">Try again</button></div> : wireEvents.length ? <Timeline events={wireEvents} /> : <p className="text-sm text-slate-500">No recorded history for this wire.</p>}
      </dialog>}
    </div>
  );
}
