import { NextResponse } from 'next/server';
import { withAuth, verifyTenantResource } from '@/lib/api-auth';
import { ROLES } from '@/lib/roles';

// Only Auditors and CFOs have forensic timeline access
export const GET = withAuth([ROLES.AUDITOR, ROLES.CFO], async (req, { params }, auth) => {
  try {
    await verifyTenantResource(auth.supabase, 'wire_requests', params.wireId, auth.companyId);

    const { data: logs, error } = await auth.supabase
      .from('audit_logs')
      .select(`
        id,
        action,
        new_hash,
        created_at,
        actor:actor_id (full_name, role)
      `)
      .eq('wire_id', params.wireId)
      .eq('company_id', auth.companyId)
      .order('created_at', { ascending: true }); // Crucial: chronological order for replay

    if (error) throw error;

    const headers = new Headers();
    headers.set('Cache-Control', 'no-store');

    return NextResponse.json({ success: true, data: logs }, { status: 200, headers });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
