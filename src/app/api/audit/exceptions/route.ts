export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { ROLES } from '@/lib/roles';
import { findComplianceExceptions, type ExceptionWire, type ApprovedVendorChange } from '@/lib/compliance-exceptions';

// Use the authenticated tenant client, not the cross-workspace support client.
export const GET = withAuth([ROLES.AUDITOR, ROLES.CFO], async (_req, _ctx, auth) => {
  try {
    const cutoff = new Date().toISOString();
    const wires: ExceptionWire[] = [];
    const changes: ApprovedVendorChange[] = [];
    // Page both datasets so the default database row cap cannot hide exceptions.
    const pageSize = 500;
    for (let offset = 0; ; offset += pageSize) {
      let query = auth.supabase.from('wire_requests')
        .select('id, vendor_id, vendor_name_snapshot, amount, currency, created_at, risk_score, status')
        .eq('company_id', auth.companyId)
        .lte('created_at', cutoff);
      // Preserve the existing CFO quarantine boundary.
      if (auth.role === ROLES.CFO) query = query.lte('visible_after', cutoff);
      const { data, error } = await query.order('created_at', { ascending: false })
        .order('id', { ascending: false }).range(offset, offset + pageSize - 1);
      if (error) throw error;
      wires.push(...(data || []));
      if (!data || data.length < pageSize) break;
    }
    if (wires.length) {
      const oldest = wires.reduce((oldest, wire) => Math.min(oldest, Date.parse(wire.created_at)), Infinity);
      const since = new Date(oldest - 7 * 24 * 60 * 60 * 1000).toISOString();
      for (let offset = 0; ; offset += pageSize) {
        const { data, error } = await auth.supabase.from('vendor_change_requests')
          .select('vendor_id, status, reviewed_at')
          .eq('company_id', auth.companyId).eq('status', 'approved')
          .gte('reviewed_at', since).lte('reviewed_at', cutoff)
          .order('reviewed_at', { ascending: true }).order('id', { ascending: true })
          .range(offset, offset + pageSize - 1);
        if (error) throw error;
        changes.push(...(data || []));
        if (!data || data.length < pageSize) break;
      }
    }
    return NextResponse.json({ success: true, data: findComplianceExceptions(wires, changes) }, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    console.error('Could not load compliance exceptions.', error);
    return NextResponse.json({ error: 'Unable to load exceptions. Please try again.' }, { status: 500 });
  }
});
