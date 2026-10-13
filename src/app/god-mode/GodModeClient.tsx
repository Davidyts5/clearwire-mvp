"use client";

import { useState } from 'react';
import {
  Activity,
  Building2,
  Clock3,
  Eye,
  EyeOff,
  Lock,
  Shield,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import Decimal from 'decimal.js';

export type GodModeCompany = {
  id: string;
  name: string;
  is_frozen: boolean | null;
  inbound_delay_minutes: number | null;
};

type GodModeClientProps = {
  telemetry: {
    totalWorkspaces: number;
    totalUsers: number;
    totalWireVolumeUsd: string;
  };
  companies: GodModeCompany[];
  migrationPending: boolean;
};

const countFormatter = new Intl.NumberFormat('en-US');

function formatUsd(amount: string) {
  const [whole = '0', fraction = '00'] = new Decimal(amount).toFixed(2).split('.');
  const groupedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `$${groupedWhole}.${fraction}`;
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="rounded-xl border border-emerald-500/20 bg-[#101410] p-5 shadow-[0_12px_40px_-28px_rgba(16,185,129,0.6)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-500/70">{label}</p>
          <p className="mt-3 break-words font-mono text-2xl font-semibold text-emerald-300 sm:text-3xl">{value}</p>
          <p className="mt-2 text-xs text-emerald-500/55">{detail}</p>
        </div>
        <span className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2.5 text-emerald-400" aria-hidden="true">
          <Icon size={18} />
        </span>
      </div>
    </article>
  );
}

export default function GodModeClient({ telemetry, companies, migrationPending }: GodModeClientProps) {
  const [ghostMode, setGhostMode] = useState(false);
  const [invoiceWireId, setInvoiceWireId] = useState('');
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
  const [invoiceBusy, setInvoiceBusy] = useState(false);
  const [replacementBusy, setReplacementBusy] = useState(false);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [invoiceStatus, setInvoiceStatus] = useState<string | null>(null);
  const toggleGhostMode = () => setGhostMode((current) => !current);
  const formattedVolume = formatUsd(telemetry.totalWireVolumeUsd);

  const invoiceEndpoint = () => `/api/god-mode/wires/${encodeURIComponent(invoiceWireId.trim())}/invoice`;

  const inspectInvoice = async () => {
    if (!invoiceWireId.trim()) {
      setInvoiceError('Enter a wire ID first.');
      return;
    }

    setInvoiceBusy(true);
    setInvoiceError(null);
    setInvoiceStatus(null);
    setInvoiceUrl(null);
    try {
      const response = await fetch(invoiceEndpoint(), { method: 'GET', cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || !result.success || !result.data?.signedUrl) {
        throw new Error(result.error || 'Invoice inspection failed.');
      }
      setInvoiceUrl(result.data.signedUrl);
      setInvoiceStatus(`Secure preview link expires in ${result.data.expiresInSeconds ?? 60} seconds.`);
    } catch (error) {
      setInvoiceError(error instanceof Error ? error.message : 'Invoice inspection failed.');
    } finally {
      setInvoiceBusy(false);
    }
  };

  const replaceInvoice = async () => {
    if (!invoiceWireId.trim()) {
      setInvoiceError('Enter a wire ID first.');
      return;
    }
    if (!invoiceFile) {
      setInvoiceError('Choose a replacement invoice file first.');
      return;
    }

    setReplacementBusy(true);
    setInvoiceError(null);
    setInvoiceStatus(null);
    try {
      const body = new FormData();
      body.append('invoice', invoiceFile);
      const response = await fetch(invoiceEndpoint(), { method: 'POST', body });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Invoice replacement failed.');
      }
      setInvoiceFile(null);
      setInvoiceUrl(null);
      setInvoiceStatus(result.message || 'Invoice replaced and recorded in the WORM audit chain. Use Inspect Invoice to refresh the preview.');
    } catch (error) {
      setInvoiceError(error instanceof Error ? error.message : 'Invoice replacement failed.');
    } finally {
      setReplacementBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] overflow-y-auto bg-[#0a0a0a] text-emerald-500 selection:bg-emerald-500/30 selection:text-emerald-100">
      <div className="min-h-full bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.08),transparent_44%)]">
        <header className="border-b border-emerald-500/15 bg-[#0a0a0a]/90 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-emerald-300" aria-hidden="true">
                <Shield size={22} />
              </span>
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-emerald-500/55">ClearWire / Platform Operations</p>
                <h1 className="mt-1 text-xl font-semibold tracking-tight text-emerald-100 sm:text-2xl">God Mode Command Deck</h1>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-xl border border-emerald-500/20 bg-[#101410] px-4 py-3 sm:justify-start">
              <div>
                <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-emerald-200">Ghost Mode</p>
                <p className="mt-1 text-[11px] text-emerald-500/60">Display-only switch · never disables WORM logging</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={ghostMode}
                aria-label={`Ghost Mode ${ghostMode ? 'on' : 'off'} (display-only; audit logging remains enabled)`}
                onClick={toggleGhostMode}
                className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a] ${ghostMode ? 'border-amber-400/60 bg-amber-500/20' : 'border-emerald-500/30 bg-emerald-950/80'}`}
              >
                <span className={`h-5 w-5 rounded-full transition-transform ${ghostMode ? 'translate-x-6 bg-amber-300' : 'translate-x-1 bg-emerald-400'}`} />
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl space-y-7 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Global telemetry">
            <MetricCard
              icon={Building2}
              label="Total Workspaces"
              value={countFormatter.format(telemetry.totalWorkspaces)}
              detail="All company records"
            />
            <MetricCard
              icon={Users}
              label="Total Users"
              value={countFormatter.format(telemetry.totalUsers)}
              detail="Across all workspaces"
            />
            <MetricCard
              icon={Wallet}
              label="Total Wire Volume (USD)"
              value={formattedVolume}
              detail="Sum of recorded wire requests"
            />
          </section>

          <section className={`rounded-xl border p-4 sm:p-5 ${ghostMode ? 'border-amber-500/30 bg-amber-950/15' : 'border-emerald-500/20 bg-[#101410]'}`} aria-labelledby="ghost-mode-note">
            <div className="flex items-start gap-3">
              {ghostMode ? <EyeOff className="mt-0.5 shrink-0 text-amber-300" size={18} aria-hidden="true" /> : <Eye className="mt-0.5 shrink-0 text-emerald-400" size={18} aria-hidden="true" />}
              <div>
                <h2 id="ghost-mode-note" className={`text-sm font-semibold ${ghostMode ? 'text-amber-200' : 'text-emerald-200'}`}>
                  Ghost Mode {ghostMode ? 'ON' : 'OFF'} · audit policy
                </h2>
                <p className="mt-2 text-sm leading-6 text-emerald-100/80">
                  Ghost Mode is a request marker, not an audit bypass. ClearWire Security records Super Admin interventions as{' '}
                  <code className="rounded border border-emerald-500/20 bg-black/40 px-1.5 py-0.5 font-mono text-emerald-300">SYSTEM_SUPPORT_INTERVENTION</code>{' '}
                  in the WORM ledger even when Ghost Mode is requested.
                </p>
                <p className="mt-2 text-xs leading-5 text-amber-200/80">
                  This switch currently changes only its on-screen state; the dashboard has no support action controls connected to it. The support APIs independently enforce WORM logging and return an audit confirmation.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-emerald-500/20 bg-[#101410] p-4 sm:p-5" aria-labelledby="invoice-inspection-title">
            <div>
              <div className="flex items-center gap-2 text-emerald-400">
                <Eye size={16} aria-hidden="true" />
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-500/60">Quarantine support</p>
              </div>
              <h2 id="invoice-inspection-title" className="mt-2 text-lg font-semibold text-emerald-100">Invoice Inspection &amp; Replacement</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-emerald-100/70">
                Inspect an invoice by wire ID or replace the stored file without changing the wire&apos;s invoice path. Replacement attempts and completion are WORM-logged, and the prior file is retained in restricted support storage.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <label className="block">
                <span className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-500/65">Wire ID</span>
                <input
                  value={invoiceWireId}
                  onChange={(event) => {
                    setInvoiceWireId(event.target.value);
                    setInvoiceFile(null);
                    setInvoiceUrl(null);
                    setInvoiceError(null);
                    setInvoiceStatus(null);
                  }}
                  inputMode="text"
                  autoComplete="off"
                  placeholder="Enter the quarantined wire UUID"
                  className="w-full rounded-lg border border-emerald-500/20 bg-black/40 px-3 py-2.5 font-mono text-sm text-emerald-100 placeholder:text-emerald-500/30 focus:border-emerald-400/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </label>
              <button
                type="button"
                onClick={() => void inspectInvoice()}
                disabled={invoiceBusy || replacementBusy || !invoiceWireId.trim()}
                className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-100 transition-colors hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {invoiceBusy ? 'Inspecting…' : 'Inspect Invoice'}
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <label className="block">
                <span className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-500/65">Replacement file</span>
                <input
                  key={invoiceFile?.name ?? 'empty-invoice-input'}
                  type="file"
                  accept="application/pdf,image/jpeg,image/png"
                  onChange={(event) => setInvoiceFile(event.target.files?.[0] ?? null)}
                  className="block w-full rounded-lg border border-emerald-500/20 bg-black/40 px-3 py-2 text-sm text-emerald-100 file:mr-3 file:rounded-md file:border-0 file:bg-emerald-500/15 file:px-3 file:py-1.5 file:font-semibold file:text-emerald-200 hover:file:bg-emerald-500/25"
                />
                <span className="mt-1.5 block text-xs text-emerald-500/50">PDF, JPG, or PNG · maximum 2 MB. Original content is archived privately before replacement.</span>
              </label>
              <button
                type="button"
                onClick={() => void replaceInvoice()}
                disabled={replacementBusy || invoiceBusy || !invoiceWireId.trim() || !invoiceFile}
                className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-100 transition-colors hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {replacementBusy ? 'Replacing…' : 'Replace & Audit'}
              </button>
            </div>

            {invoiceError && <p role="alert" className="rounded-lg border border-red-500/25 bg-red-950/20 px-3 py-2 text-sm text-red-200">{invoiceError}</p>}
            {invoiceStatus && <p role="status" className="rounded-lg border border-emerald-500/20 bg-emerald-950/20 px-3 py-2 text-sm text-emerald-100">{invoiceStatus}</p>}

            {invoiceUrl && (
              <div className="overflow-hidden rounded-xl border border-emerald-500/20 bg-black/30">
                <div className="flex flex-col gap-2 border-b border-emerald-500/15 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="font-mono text-xs text-emerald-200">Temporary invoice preview · expires in 60 seconds</p>
                  <a href={invoiceUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-emerald-300 underline decoration-emerald-500/40 underline-offset-4 hover:text-emerald-100">
                    Open secure preview
                  </a>
                </div>
                <iframe
                  src={invoiceUrl}
                  title={`Invoice preview for wire ${invoiceWireId}`}
                  referrerPolicy="no-referrer"
                  className="h-[520px] w-full bg-white"
                />
              </div>
            )}
          </section>

          {migrationPending && (
            <div role="status" className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 text-sm leading-6 text-amber-100">
              <Clock3 className="mt-0.5 shrink-0 text-amber-300" size={18} aria-hidden="true" />
              <p>
                V37 is not applied yet. Workspace names and global telemetry are available, but freeze and inbound-delay values are not loaded. This dashboard does not apply database migrations.
              </p>
            </div>
          )}

          <section className="overflow-hidden rounded-xl border border-emerald-500/20 bg-[#101410]" aria-labelledby="workspace-table-title">
            <div className="flex flex-col gap-3 border-b border-emerald-500/15 px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-5">
              <div>
                <div className="flex items-center gap-2 text-emerald-400">
                  <Activity size={16} aria-hidden="true" />
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-500/60">Cross-tenant control plane</p>
                </div>
                <h2 id="workspace-table-title" className="mt-2 text-lg font-semibold text-emerald-100">Company Workspaces</h2>
                <p className="mt-1 text-xs leading-5 text-emerald-500/60">
                  All workspace records are shown. The current schema has no separate active or archived status; freeze state is shown independently.
                </p>
              </div>
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 font-mono text-[11px] text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                {countFormatter.format(companies.length)} workspaces
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-emerald-500/10 bg-black/20 font-mono text-[10px] uppercase tracking-[0.16em] text-emerald-500/55">
                    <th scope="col" className="px-5 py-3 font-semibold">Workspace</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Inbound quarantine</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Company freeze</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Control state</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-500/10">
                  {companies.map((company) => (
                    <tr key={company.id} className="transition-colors hover:bg-emerald-500/[0.035]">
                      <td className="px-5 py-4">
                        <p className="font-medium text-emerald-100">{company.name}</p>
                        <p className="mt-1 font-mono text-[10px] text-emerald-500/45">{company.id}</p>
                      </td>
                      <td className="px-5 py-4 font-mono text-sm text-emerald-200">
                        {company.inbound_delay_minutes === null
                          ? '—'
                          : `${countFormatter.format(company.inbound_delay_minutes)} min`}
                      </td>
                      <td className="px-5 py-4">
                        {company.is_frozen === null ? (
                          <span className="text-xs text-amber-200/70">Pending migration</span>
                        ) : company.is_frozen ? (
                          <span className="inline-flex items-center gap-2 rounded-full border border-red-400/25 bg-red-500/10 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-red-300">
                            <Lock size={12} aria-hidden="true" /> Frozen
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/5 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                            <Shield size={12} aria-hidden="true" /> Not frozen
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-emerald-500/65">
                        {company.is_frozen === null ? 'UNKNOWN' : company.is_frozen ? 'RESTRICTED' : 'OPERATIONAL'}
                      </td>
                    </tr>
                  ))}
                  {companies.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-5 py-12 text-center text-sm text-emerald-500/55">
                        No workspace records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <footer className="flex flex-col gap-2 border-t border-emerald-500/10 pt-4 font-mono text-[10px] uppercase tracking-[0.12em] text-emerald-500/40 sm:flex-row sm:items-center sm:justify-between">
            <span>Restricted system · allowlisted super-admin access</span>
            <span>Dashboard controls are read-only · support actions are API-gated and audited</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
