"use client";

import { useEffect, useState } from 'react';
import {
  Activity,
  Building2,
  Clock3,
  Eye,
  EyeOff,
  Lock,
  Pencil,
  RefreshCw,
  Shield,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react';
import Decimal from 'decimal.js';

export type GodModeCompany = {
  id: string;
  name: string;
  is_frozen: boolean | null;
  inbound_delay_minutes: number | null;
};

type DrillDownDevice = {
  id: string;
  user_id: string;
  device_name: string | null;
  browser: string | null;
  os: string | null;
  form_factor: string | null;
  created_at: string | null;
  last_used_at: string | null;
};

type DrillDownUser = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  deviceId: string | null;
  user_authenticators: DrillDownDevice[];
};

type DrillDownData = {
  company: GodModeCompany;
  stats: {
    totalWireVolumeUsd: string;
    totalWires: number;
    frozenWires: number;
  };
  users: DrillDownUser[];
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
  const [vendorId, setVendorId] = useState('');
  const [vendorCompanyId, setVendorCompanyId] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [vendorAccountNumber, setVendorAccountNumber] = useState('');
  const [vendorSwiftBic, setVendorSwiftBic] = useState('');
  const [vendorLoaded, setVendorLoaded] = useState(false);
  const [vendorBusy, setVendorBusy] = useState(false);
  const [vendorSaveBusy, setVendorSaveBusy] = useState(false);
  const [vendorError, setVendorError] = useState<string | null>(null);
  const [vendorStatus, setVendorStatus] = useState<string | null>(null);
  const [wireStateId, setWireStateId] = useState('');
  const [wireStateCompanyId, setWireStateCompanyId] = useState('');
  const [wireStateStatus, setWireStateStatus] = useState('pending_cfo');
  const [wireCurrentStatus, setWireCurrentStatus] = useState<string | null>(null);
  const [wireStateBusy, setWireStateBusy] = useState(false);
  const [wireStateSaveBusy, setWireStateSaveBusy] = useState(false);
  const [wireStateError, setWireStateError] = useState<string | null>(null);
  const [wireStateMessage, setWireStateMessage] = useState<string | null>(null);
  const [workspaces, setWorkspaces] = useState<GodModeCompany[]>(companies);
  const [selectedWorkspace, setSelectedWorkspace] = useState<GodModeCompany | null>(null);
  const [drillData, setDrillData] = useState<DrillDownData | null>(null);
  const [drillLoading, setDrillLoading] = useState(false);
  const [drillError, setDrillError] = useState<string | null>(null);
  const [delayMinutes, setDelayMinutes] = useState('');
  const [delaySaving, setDelaySaving] = useState(false);
  const [delayMessage, setDelayMessage] = useState<string | null>(null);
  const [revokingDeviceId, setRevokingDeviceId] = useState<string | null>(null);
  const [userMessage, setUserMessage] = useState<string | null>(null);
  const [userError, setUserError] = useState<string | null>(null);
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

  const fetchVendor = async () => {
    if (!vendorId.trim()) {
      setVendorError('Enter a vendor ID first.');
      return;
    }
    setVendorBusy(true);
    setVendorError(null);
    setVendorStatus(null);
    setVendorLoaded(false);
    try {
      const response = await fetch(`/api/god-mode/vendors/${encodeURIComponent(vendorId.trim())}`, { method: 'GET', cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.error || 'Vendor lookup failed.');
      }
      setVendorCompanyId(result.data.company_id || '');
      setVendorName(result.data.name || '');
      setVendorAccountNumber(result.data.account_number || '');
      setVendorSwiftBic(result.data.swift_bic || '');
      setVendorLoaded(true);
      setVendorStatus('Vendor loaded. Review the current details, edit them, then save — the old and new values are recorded in the WORM audit chain.');
    } catch (error) {
      setVendorError(error instanceof Error ? error.message : 'Vendor lookup failed.');
    } finally {
      setVendorBusy(false);
    }
  };

  const saveVendor = async () => {
    if (!vendorLoaded) {
      setVendorError('Fetch the vendor first.');
      return;
    }
    setVendorSaveBusy(true);
    setVendorError(null);
    setVendorStatus(null);
    try {
      const response = await fetch(`/api/god-mode/vendors/${encodeURIComponent(vendorId.trim())}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: vendorName,
          account_number: vendorAccountNumber,
          swift_bic: vendorSwiftBic,
          company_id: vendorCompanyId,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Vendor update failed.');
      }
      setVendorStatus(result.message || 'Vendor updated and recorded in the WORM audit chain.');
    } catch (error) {
      setVendorError(error instanceof Error ? error.message : 'Vendor update failed.');
    } finally {
      setVendorSaveBusy(false);
    }
  };

  const fetchWireState = async () => {
    if (!wireStateId.trim()) {
      setWireStateError('Enter a wire ID first.');
      return;
    }
    setWireStateBusy(true);
    setWireStateError(null);
    setWireStateMessage(null);
    setWireCurrentStatus(null);
    try {
      const response = await fetch(`/api/god-mode/wires/${encodeURIComponent(wireStateId.trim())}/state`, { method: 'GET', cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.error || 'Wire lookup failed.');
      }
      setWireStateCompanyId(result.data.company_id || '');
      setWireCurrentStatus(result.data.status || null);
      setWireStateMessage(`Current status: ${result.data.status}. Choose the forced status below — the previous and new statuses are recorded in the WORM audit chain.`);
    } catch (error) {
      setWireStateError(error instanceof Error ? error.message : 'Wire lookup failed.');
    } finally {
      setWireStateBusy(false);
    }
  };

  const forceWireState = async () => {
    if (!wireStateId.trim() || !wireStateCompanyId.trim()) {
      setWireStateError('Enter a wire ID and fetch it (or enter its workspace/company ID) first.');
      return;
    }
    setWireStateSaveBusy(true);
    setWireStateError(null);
    setWireStateMessage(null);
    try {
      const response = await fetch(`/api/god-mode/wires/${encodeURIComponent(wireStateId.trim())}/state`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: wireStateStatus, company_id: wireStateCompanyId }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Wire state override failed.');
      }
      setWireCurrentStatus(result.data?.status || wireStateStatus);
      setWireStateMessage(
        result.message
          ? `${result.message}${result.data?.previous_status ? ` (${result.data.previous_status} → ${result.data.status})` : ''}`
          : 'Wire state forced and recorded in the WORM audit chain.',
      );
    } catch (error) {
      setWireStateError(error instanceof Error ? error.message : 'Wire state override failed.');
    } finally {
      setWireStateSaveBusy(false);
    }
  };

  const fetchDrillDown = async (company: GodModeCompany) => {
    setDrillLoading(true);
    setDrillError(null);
    setDrillData(null);
    setDelayMessage(null);
    setUserMessage(null);
    setUserError(null);
    try {
      const response = await fetch(`/api/god-mode/workspaces/${encodeURIComponent(company.id)}`, { method: 'GET', cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.error || 'Workspace drill-down failed.');
      }
      setDrillData(result.data as DrillDownData);
      if (result.data.company?.inbound_delay_minutes !== null && result.data.company?.inbound_delay_minutes !== undefined) {
        setDelayMinutes(String(result.data.company.inbound_delay_minutes));
      }
    } catch (error) {
      setDrillError(error instanceof Error ? error.message : 'Workspace drill-down failed.');
    } finally {
      setDrillLoading(false);
    }
  };

  const openDrillDown = (company: GodModeCompany) => {
    setSelectedWorkspace(company);
    setDelayMinutes(company.inbound_delay_minutes === null ? '' : String(company.inbound_delay_minutes));
    void fetchDrillDown(company);
  };

  const closeDrillDown = () => {
    setSelectedWorkspace(null);
    setDrillData(null);
    setDrillError(null);
    setDelayMessage(null);
    setUserMessage(null);
    setUserError(null);
  };

  const saveDelay = async () => {
    if (!selectedWorkspace) return;
    const parsed = Number(delayMinutes);
    if (delayMinutes.trim() === '' || !Number.isInteger(parsed) || parsed < 0 || parsed > 525600) {
      setDelayMessage(null);
      setDrillError('Enter a whole number of minutes between 0 and 525600.');
      return;
    }
    setDelaySaving(true);
    setDelayMessage(null);
    setDrillError(null);
    try {
      const response = await fetch(`/api/god-mode/workspaces/${encodeURIComponent(selectedWorkspace.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inbound_delay_minutes: parsed, ghostMode }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Delay update failed.');
      }
      setWorkspaces((current) => current.map((company) => (
        company.id === selectedWorkspace.id ? { ...company, inbound_delay_minutes: parsed } : company
      )));
      setSelectedWorkspace((current) => (current ? { ...current, inbound_delay_minutes: parsed } : current));
      setDrillData((current) => (current ? { ...current, company: { ...current.company, inbound_delay_minutes: parsed } } : current));
      setDelayMessage(
        `Inbound delay saved (${countFormatter.format(parsed)} min) and recorded in the WORM audit chain.${result.message ? ` ${result.message}` : ''}`,
      );
    } catch (error) {
      setDrillError(error instanceof Error ? error.message : 'Delay update failed.');
    } finally {
      setDelaySaving(false);
    }
  };

  const revokeDevice = async (user: DrillDownUser, device: DrillDownDevice) => {
    if (!selectedWorkspace) return;
    setRevokingDeviceId(device.id);
    setUserMessage(null);
    setUserError(null);
    try {
      const response = await fetch(`/api/god-mode/users/${encodeURIComponent(user.id)}/revoke-device`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: device.id, companyId: selectedWorkspace.id, ghostMode }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Device revocation failed.');
      }
      setDrillData((current) => {
        if (!current) return current;
        return {
          ...current,
          users: current.users.map((candidate) => {
            if (candidate.id !== user.id) return candidate;
            const remaining = candidate.user_authenticators.filter((authenticator) => authenticator.id !== device.id);
            return { ...candidate, user_authenticators: remaining, deviceId: remaining[0]?.id ?? null };
          }),
        };
      });
      setUserMessage(
        `Device revoked for ${user.full_name || user.email || user.id} and recorded in the WORM audit chain.${result.message ? ` ${result.message}` : ''}`,
      );
    } catch (error) {
      setUserError(error instanceof Error ? error.message : 'Device revocation failed.');
    } finally {
      setRevokingDeviceId(null);
    }
  };

  useEffect(() => {
    if (!selectedWorkspace) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeDrillDown();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWorkspace?.id]);

  const supportInputClassName = 'w-full rounded-lg border border-emerald-500/20 bg-black/40 px-3 py-2.5 font-mono text-sm text-emerald-100 placeholder:text-emerald-500/30 focus:border-emerald-400/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/20';
  const supportLabelClassName = 'mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-500/65';

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

          <section className="space-y-4 rounded-xl border border-emerald-500/20 bg-[#101410] p-4 sm:p-5" aria-labelledby="vendor-editing-title">
            <div>
              <div className="flex items-center gap-2 text-emerald-400">
                <Pencil size={16} aria-hidden="true" />
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-500/60">Vendor support</p>
              </div>
              <h2 id="vendor-editing-title" className="mt-2 text-lg font-semibold text-emerald-100">Edit Vendor Details</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-emerald-100/70">
                Fetch a vendor by ID, review its current bank details, and save corrections. Every edit is written to the WORM ledger as{' '}
                <code className="rounded border border-emerald-500/20 bg-black/40 px-1.5 py-0.5 font-mono text-emerald-300">VENDOR_MODIFIED_BY_SUPPORT</code>{' '}
                with the old and new values. Ghost Mode does not suppress this logging.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <label className="block">
                <span className={supportLabelClassName}>Vendor ID</span>
                <input
                  value={vendorId}
                  onChange={(event) => {
                    setVendorId(event.target.value);
                    setVendorLoaded(false);
                    setVendorError(null);
                    setVendorStatus(null);
                  }}
                  inputMode="text"
                  autoComplete="off"
                  placeholder="Enter the vendor UUID"
                  className={supportInputClassName}
                />
              </label>
              <button
                type="button"
                onClick={() => void fetchVendor()}
                disabled={vendorBusy || vendorSaveBusy || !vendorId.trim()}
                className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-100 transition-colors hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {vendorBusy ? 'Fetching…' : 'Fetch Vendor'}
              </button>
            </div>

            {vendorLoaded && (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className={supportLabelClassName}>Vendor name</span>
                    <input value={vendorName} onChange={(event) => setVendorName(event.target.value)} autoComplete="off" className={supportInputClassName} />
                  </label>
                  <label className="block">
                    <span className={supportLabelClassName}>Workspace (Company ID)</span>
                    <input value={vendorCompanyId} readOnly aria-readonly="true" className={`${supportInputClassName} opacity-60`} />
                  </label>
                  <label className="block">
                    <span className={supportLabelClassName}>Account number</span>
                    <input value={vendorAccountNumber} onChange={(event) => setVendorAccountNumber(event.target.value)} autoComplete="off" className={supportInputClassName} />
                  </label>
                  <label className="block">
                    <span className={supportLabelClassName}>SWIFT / BIC</span>
                    <input value={vendorSwiftBic} onChange={(event) => setVendorSwiftBic(event.target.value)} autoComplete="off" placeholder="Optional" className={supportInputClassName} />
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => void saveVendor()}
                  disabled={vendorSaveBusy || vendorBusy || !vendorName.trim() || !vendorAccountNumber.trim()}
                  className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-100 transition-colors hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {vendorSaveBusy ? 'Saving…' : 'Save Vendor & Audit'}
                </button>
              </div>
            )}

            {vendorError && <p role="alert" className="rounded-lg border border-red-500/25 bg-red-950/20 px-3 py-2 text-sm text-red-200">{vendorError}</p>}
            {vendorStatus && <p role="status" className="rounded-lg border border-emerald-500/20 bg-emerald-950/20 px-3 py-2 text-sm text-emerald-100">{vendorStatus}</p>}
          </section>

          <section className="space-y-4 rounded-xl border border-emerald-500/20 bg-[#101410] p-4 sm:p-5" aria-labelledby="wire-state-title">
            <div>
              <div className="flex items-center gap-2 text-emerald-400">
                <RefreshCw size={16} aria-hidden="true" />
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-500/60">Wire support</p>
              </div>
              <h2 id="wire-state-title" className="mt-2 text-lg font-semibold text-emerald-100">Wire State Override — Force Push</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-emerald-100/70">
                Force a wire into a new status. Every override is written to the WORM ledger as{' '}
                <code className="rounded border border-emerald-500/20 bg-black/40 px-1.5 py-0.5 font-mono text-emerald-300">WIRE_STATE_FORCED_BY_SUPPORT</code>{' '}
                with the previous and new statuses. Ghost Mode does not suppress this logging.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <label className="block">
                <span className={supportLabelClassName}>Wire ID</span>
                <input
                  value={wireStateId}
                  onChange={(event) => {
                    setWireStateId(event.target.value);
                    setWireCurrentStatus(null);
                    setWireStateError(null);
                    setWireStateMessage(null);
                  }}
                  inputMode="text"
                  autoComplete="off"
                  placeholder="Enter the wire UUID"
                  className={supportInputClassName}
                />
              </label>
              <button
                type="button"
                onClick={() => void fetchWireState()}
                disabled={wireStateBusy || wireStateSaveBusy || !wireStateId.trim()}
                className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-100 transition-colors hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {wireStateBusy ? 'Fetching…' : 'Fetch Wire'}
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 sm:items-end">
              <label className="block">
                <span className={supportLabelClassName}>Workspace (Company ID)</span>
                <input
                  value={wireStateCompanyId}
                  onChange={(event) => setWireStateCompanyId(event.target.value)}
                  inputMode="text"
                  autoComplete="off"
                  placeholder="Filled in by Fetch Wire"
                  className={supportInputClassName}
                />
              </label>
              <label className="block">
                <span className={supportLabelClassName}>Current status</span>
                <input value={wireCurrentStatus ?? '—'} readOnly aria-readonly="true" className={`${supportInputClassName} opacity-60`} />
              </label>
              <label className="block">
                <span className={supportLabelClassName}>Force to status</span>
                <select
                  value={wireStateStatus}
                  onChange={(event) => setWireStateStatus(event.target.value)}
                  className={supportInputClassName}
                >
                  <option value="pending_cfo">pending_cfo</option>
                  <option value="approved">approved</option>
                  <option value="rejected">rejected</option>
                  <option value="frozen">frozen</option>
                </select>
              </label>
            </div>

            <button
              type="button"
              onClick={() => void forceWireState()}
              disabled={wireStateSaveBusy || wireStateBusy || !wireStateId.trim() || !wireStateCompanyId.trim()}
              className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-100 transition-colors hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {wireStateSaveBusy ? 'Forcing…' : 'Force Wire State & Audit'}
            </button>

            {wireStateError && <p role="alert" className="rounded-lg border border-red-500/25 bg-red-950/20 px-3 py-2 text-sm text-red-200">{wireStateError}</p>}
            {wireStateMessage && <p role="status" className="rounded-lg border border-emerald-500/20 bg-emerald-950/20 px-3 py-2 text-sm text-emerald-100">{wireStateMessage}</p>}
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
                  All workspace records are shown. Click a workspace row to open its drill-down: company stats, inbound quarantine delay, and user device management. Freeze state is shown independently.
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
                  {workspaces.map((company) => (
                    <tr
                      key={company.id}
                      onClick={() => openDrillDown(company)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          openDrillDown(company);
                        }
                      }}
                      tabIndex={0}
                      title={`Open drill-down for ${company.name}`}
                      aria-label={`Open drill-down for ${company.name}`}
                      className="cursor-pointer transition-colors hover:bg-emerald-500/[0.035] focus-visible:bg-emerald-500/[0.06] focus-visible:outline-none"
                    >
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

          {selectedWorkspace && (
            <div className="fixed inset-0 z-[300] flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-labelledby="drill-down-title">
              <button type="button" aria-label="Close drill-down" onClick={closeDrillDown} className="absolute inset-0 h-full w-full cursor-default" />
              <div className="relative my-auto w-full max-w-3xl rounded-2xl border border-emerald-500/25 bg-[#0d120d] shadow-[0_24px_80px_-24px_rgba(16,185,129,0.45)]">
                <div className="flex items-start justify-between gap-4 border-b border-emerald-500/15 px-5 py-4">
                  <div>
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-500/55">Workspace drill-down</p>
                    <h2 id="drill-down-title" className="mt-1 text-lg font-semibold text-emerald-100">{selectedWorkspace.name}</h2>
                    <p className="mt-1 break-all font-mono text-[11px] text-emerald-500/50">{selectedWorkspace.id}</p>
                  </div>
                  <button
                    type="button"
                    onClick={closeDrillDown}
                    aria-label="Close drill-down"
                    className="rounded-lg border border-emerald-500/25 bg-black/40 p-2 text-emerald-300 transition-colors hover:bg-emerald-500/15"
                  >
                    <X size={16} aria-hidden="true" />
                  </button>
                </div>

                <div className="max-h-[75vh] space-y-5 overflow-y-auto px-5 py-5">
                  <p className="rounded-lg border border-emerald-500/20 bg-emerald-950/20 px-3 py-2 text-xs leading-5 text-emerald-100/75">
                    Support actions in this drill-down are always recorded in the WORM ledger. Ghost Mode is a request marker only — it never suppresses audit logging for delay changes or device revocations.
                  </p>

                  {drillLoading && <p role="status" className="text-sm text-emerald-200">Loading workspace details…</p>}
                  {drillError && <p role="alert" className="rounded-lg border border-red-500/25 bg-red-950/20 px-3 py-2 text-sm text-red-200">{drillError}</p>}

                  <section aria-labelledby="drill-stats-title">
                    <h3 id="drill-stats-title" className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-500/60">Company Stats</h3>
                    {drillData ? (
                      <div className="mt-3 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-xl border border-emerald-500/20 bg-black/30 p-4">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-emerald-500/60">Wire Volume</p>
                          <p className="mt-2 font-mono text-xl font-semibold text-emerald-200">{formatUsd(drillData.stats.totalWireVolumeUsd)}</p>
                          <p className="mt-1 text-[11px] text-emerald-500/50">{countFormatter.format(drillData.stats.totalWires)} wires</p>
                        </div>
                        <div className="rounded-xl border border-emerald-500/20 bg-black/30 p-4">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-emerald-500/60">Frozen Wires</p>
                          <p className="mt-2 font-mono text-xl font-semibold text-emerald-200">{countFormatter.format(drillData.stats.frozenWires)}</p>
                          <p className="mt-1 text-[11px] text-emerald-500/50">status = frozen</p>
                        </div>
                        <div className="rounded-xl border border-emerald-500/20 bg-black/30 p-4">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-emerald-500/60">Users</p>
                          <p className="mt-2 font-mono text-xl font-semibold text-emerald-200">{countFormatter.format(drillData.users.length)}</p>
                          <p className="mt-1 text-[11px] text-emerald-500/50">in this workspace</p>
                        </div>
                      </div>
                    ) : (
                      !drillLoading && <p className="mt-2 text-sm text-emerald-500/55">Stats unavailable until the drill-down loads.</p>
                    )}
                  </section>

                  <section className="border-t border-emerald-500/10 pt-5" aria-labelledby="drill-delay-title">
                    <h3 id="drill-delay-title" className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-500/60">Quarantine Delay</h3>
                    <p className="mt-2 text-sm leading-6 text-emerald-100/70">
                      Inbound wires for this workspace stay hidden from approvers for this many minutes after creation. Saving is WORM-logged as{' '}
                      <code className="rounded border border-emerald-500/20 bg-black/40 px-1.5 py-0.5 font-mono text-emerald-300">WORKSPACE_DELAY_UPDATED</code>.
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                      <label className="block">
                        <span className={supportLabelClassName}>Inbound delay (minutes)</span>
                        <input
                          value={delayMinutes}
                          onChange={(event) => setDelayMinutes(event.target.value)}
                          type="number"
                          min={0}
                          max={525600}
                          step={1}
                          inputMode="numeric"
                          placeholder="e.g. 30"
                          className={supportInputClassName}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => void saveDelay()}
                        disabled={delaySaving || drillLoading}
                        className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-100 transition-colors hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {delaySaving ? 'Saving…' : 'Save Delay'}
                      </button>
                    </div>
                    {delayMessage && <p role="status" className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-950/20 px-3 py-2 text-sm text-emerald-100">{delayMessage}</p>}
                  </section>

                  <section className="border-t border-emerald-500/10 pt-5" aria-labelledby="drill-users-title">
                    <h3 id="drill-users-title" className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-500/60">User Management</h3>
                    {userMessage && <p role="status" className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-950/20 px-3 py-2 text-sm text-emerald-100">{userMessage}</p>}
                    {userError && <p role="alert" className="mt-3 rounded-lg border border-red-500/25 bg-red-950/20 px-3 py-2 text-sm text-red-200">{userError}</p>}
                    {drillData ? (
                      <ul className="mt-3 divide-y divide-emerald-500/10 rounded-xl border border-emerald-500/15 bg-black/20">
                        {drillData.users.map((user) => (
                          <li key={user.id} className="px-4 py-3">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <p className="font-medium text-emerald-100">{user.full_name || 'Unnamed user'}</p>
                                <p className="mt-0.5 break-all text-xs text-emerald-500/60">{user.email || 'No email'} · {user.role || 'no role'}</p>
                                <p className="mt-0.5 break-all font-mono text-[10px] text-emerald-500/40">{user.id}</p>
                              </div>
                            </div>
                            {user.user_authenticators.length > 0 ? (
                              <ul className="mt-3 space-y-2">
                                {user.user_authenticators.map((device) => (
                                  <li key={device.id} className="flex flex-col gap-2 rounded-lg border border-emerald-500/10 bg-black/30 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                      <p className="text-xs font-medium text-emerald-200">{device.device_name || device.form_factor || 'Registered device'}</p>
                                      <p className="mt-0.5 text-[11px] text-emerald-500/55">
                                        {[device.browser, device.os].filter(Boolean).join(' · ') || 'Device details unavailable'} · <span className="font-mono">{device.id}</span>
                                      </p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => void revokeDevice(user, device)}
                                      disabled={revokingDeviceId === device.id}
                                      className="shrink-0 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      {revokingDeviceId === device.id ? 'Revoking…' : 'Revoke Device'}
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="mt-2 text-xs text-emerald-500/50">No registered device.</p>
                            )}
                          </li>
                        ))}
                        {drillData.users.length === 0 && (
                          <li className="px-4 py-8 text-center text-sm text-emerald-500/55">No users in this workspace.</li>
                        )}
                      </ul>
                    ) : (
                      !drillLoading && <p className="mt-2 text-sm text-emerald-500/55">Users unavailable until the drill-down loads.</p>
                    )}
                  </section>
                </div>
              </div>
            </div>
          )}

          <footer className="flex flex-col gap-2 border-t border-emerald-500/10 pt-4 font-mono text-[10px] uppercase tracking-[0.12em] text-emerald-500/40 sm:flex-row sm:items-center sm:justify-between">
            <span>Restricted system · allowlisted super-admin access</span>
            <span>Dashboard controls are read-only · support actions are API-gated and audited</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
