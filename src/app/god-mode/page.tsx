import Decimal from 'decimal.js';
import { notFound } from 'next/navigation';
import { getAdminClient } from '@/lib/api-auth';
import { hasGodModeAccess } from '@/lib/god-mode-auth';
import GodModeClient, { type GodModeCompany } from './GodModeClient';

export const dynamic = 'force-dynamic';

const WIRE_PAGE_SIZE = 1000;

function isMissingV37CompanyColumn(error: { code?: string; message?: string }) {
  const message = (error.message ?? '').toLowerCase();
  return error.code === '42703'
    || error.code === 'PGRST204'
    || message.includes('is_frozen')
    || message.includes('inbound_delay_minutes');
}

async function getTotalWireVolume(adminClient: any): Promise<string> {
  let offset = 0;
  let total = new Decimal(0);

  while (true) {
    const { data, error } = await adminClient
      .from('wire_requests')
      .select('amount')
      .order('id', { ascending: true })
      .range(offset, offset + WIRE_PAGE_SIZE - 1);

    if (error) throw new Error(`Could not load wire volume: ${error.message}`);

    const rows = data ?? [];
    for (const row of rows) total = total.plus(row.amount ?? 0);

    if (rows.length < WIRE_PAGE_SIZE) break;
    offset += WIRE_PAGE_SIZE;
  }

  return total.toFixed(2);
}

export default async function GodModePage() {
  // Repeat the allowlist check before using the service-role client. The layout's
  // notFound gate is not the sole authorization boundary for privileged reads.
  if (!(await hasGodModeAccess())) notFound();

  const adminClient = await getAdminClient();
  const [companyResult, workspaceCountResult, userCountResult, totalWireVolume] = await Promise.all([
    adminClient
      .from('companies')
      .select('id, name, is_frozen, inbound_delay_minutes')
      .order('name', { ascending: true }),
    adminClient.from('companies').select('id', { count: 'exact', head: true }),
    adminClient.from('users').select('id', { count: 'exact', head: true }),
    getTotalWireVolume(adminClient),
  ]);

  if (workspaceCountResult.error || userCountResult.error) {
    console.error('God Mode telemetry query failed:', workspaceCountResult.error || userCountResult.error);
    throw new Error('God Mode telemetry is temporarily unavailable.');
  }

  let companies: GodModeCompany[] = [];
  let migrationPending = false;

  if (companyResult.error && isMissingV37CompanyColumn(companyResult.error)) {
    // Keep the command deck usable for read-only telemetry before V37 is applied,
    // but do not pretend the freeze/delay controls are active.
    migrationPending = true;
    const fallbackResult = await adminClient
      .from('companies')
      .select('id, name')
      .order('name', { ascending: true });

    if (fallbackResult.error) {
      console.error('God Mode workspace query failed:', fallbackResult.error);
      throw new Error('God Mode workspace data is temporarily unavailable.');
    }

    companies = (fallbackResult.data ?? []).map((company: { id: string; name: string }) => ({
      id: company.id,
      name: company.name,
      is_frozen: null,
      inbound_delay_minutes: null,
    }));
  } else if (companyResult.error) {
    console.error('God Mode workspace query failed:', companyResult.error);
    throw new Error('God Mode workspace data is temporarily unavailable.');
  } else {
    companies = (companyResult.data ?? []).map((company: GodModeCompany) => ({
      id: company.id,
      name: company.name,
      is_frozen: company.is_frozen,
      inbound_delay_minutes: company.inbound_delay_minutes,
    }));
  }

  return (
    <GodModeClient
      telemetry={{
        totalWorkspaces: workspaceCountResult.count ?? 0,
        totalUsers: userCountResult.count ?? 0,
        totalWireVolumeUsd: totalWireVolume,
      }}
      companies={companies}
      migrationPending={migrationPending}
    />
  );
}
