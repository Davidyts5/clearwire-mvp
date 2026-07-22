export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { withAuth, verifyTenantResource } from '@/lib/api-auth';
import { ROLES } from '@/lib/roles';
import { computeAuditHash, computeGenesisHash } from '@/lib/audit-chain';

export const POST = withAuth([ROLES.AUDITOR, ROLES.CFO], async (req, { params }, auth) => {
  try {
    await verifyTenantResource(auth.supabase, 'wire_requests', params.wireId, auth.companyId);

    const { data: logs, error } = await auth.supabase
      .from('audit_logs')
      .select('*')
      .eq('company_id', auth.companyId)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true });

    if (error) throw error;

    let expectedPrev = computeGenesisHash(auth.companyId);
    const results: Record<string, boolean> = {};

    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];
      let valid = true;

      // Backwards compatibility for old logs before hash chaining was introduced
      const isHistoricalPlaceholder = !log.event_payload && (
        !log.new_hash ||
        log.new_hash === 'SYSTEM' ||
        log.new_hash === 'INITIAL_STATE' ||
        (!log.new_hash.startsWith('0x') && log.new_hash.length < 64)
      );

      if (log.previous_hash !== expectedPrev) {
        if (!isHistoricalPlaceholder) valid = false;
      }

      if (log.event_payload) {
        const computedNew = computeAuditHash(log.previous_hash, log.event_payload);
        if (computedNew !== log.new_hash) {
          valid = false;
        }
      }

      // If it's the wire we care about, record the result
      if (log.wire_id === params.wireId) {
        results[log.id] = valid;
      }

      expectedPrev = log.new_hash;
    }

    return NextResponse.json({ success: true, data: results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
