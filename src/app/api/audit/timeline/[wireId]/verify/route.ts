export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { withAuth, verifyTenantResource } from '@/lib/api-auth';
import { ROLES } from '@/lib/roles';
import { verifyCompanyChain } from '@/lib/audit-chain';

export const POST = withAuth([ROLES.AUDITOR, ROLES.CFO], async (req, { params }, auth) => {
  try {
    await verifyTenantResource(auth.supabase, 'wire_requests', params.wireId, auth.companyId);

    const chainInfo = await verifyCompanyChain(auth.supabase, auth.companyId);
    
    // We only want to return the validation booleans for this specific wire ID's logs to match old behavior
    const { data: wireLogs, error } = await auth.supabase
      .from('audit_logs')
      .select('id')
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
