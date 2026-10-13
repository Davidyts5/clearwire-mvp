export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { withAuth, verifyTenantResource, getAdminClient } from '@/lib/api-auth';
import { ROLES } from '@/lib/roles';
import { verifyCompanyChain } from '@/lib/audit-chain';

export const POST = withAuth([ROLES.AUDITOR, ROLES.CFO], async (req, { params }, auth) => {
  try {
    if (auth.role === ROLES.CFO) {
      const { data: visibleWire, error: visibilityError } = await auth.supabase
        .from('wire_requests')
        .select('id')
        .eq('id', params.wireId)
        .eq('company_id', auth.companyId)
        .lte('visible_after', new Date().toISOString())
        .maybeSingle();
      if (visibilityError || !visibleWire) {
        return NextResponse.json({ error: 'Wire not found or access denied' }, { status: 404 });
      }
    }
    await verifyTenantResource(auth.supabase, 'wire_requests', params.wireId, auth.companyId);

    // Bypass the CFO quarantine read policy only for full-chain integrity computation.
    const adminClient = await getAdminClient();
    const chainInfo = await verifyCompanyChain(adminClient, auth.companyId);
    
    // We only want to return the validation booleans for this specific wire ID's logs to match old behavior
    const { data: wireLogs, error } = await adminClient
      .from('audit_logs')
      .select('id')
      .eq('company_id', auth.companyId)
      .eq('wire_id', params.wireId);

    if (error) throw error;

    const results: Record<string, boolean> = {};
    for (const log of (wireLogs || [])) {
      if (chainInfo.recordResults[log.id] !== undefined) {
        results[log.id] = chainInfo.recordResults[log.id];
      }
    }

    return NextResponse.json({ success: true, data: results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
