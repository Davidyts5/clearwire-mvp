export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { withAuth, verifyTenantResource } from '@/lib/api-auth';
import { ROLES } from '@/lib/roles';

// Only Auditors and CFOs have forensic timeline access
export const GET = withAuth([ROLES.AUDITOR, ROLES.CFO], async (req, { params }, auth) => {
  try {
    await verifyTenantResource(auth.supabase, 'wire_requests', params.wireId, auth.companyId);
    
    // Fetch the wire request to get the vendor_id
    const { data: wireReq } = await auth.supabase
      .from('wire_requests')
      .select('vendor_id')
      .eq('id', params.wireId)
      .single();

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const actorId = searchParams.get('actorId');
    const actionFilter = searchParams.get('action');

    let query = auth.supabase
      .from('audit_logs')
      .select(`
        id,
        action,
        previous_hash,
        new_hash,
        event_payload,
        created_at,
        actor:actor_id (full_name, role)
      `)
      .eq('wire_id', params.wireId)
      .eq('company_id', auth.companyId);

    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate);
    if (actorId) query = query.eq('actor_id', actorId);
    if (actionFilter) query = query.eq('action', actionFilter);

    const { data: logs, error } = await query.order('created_at', { ascending: true }).order('id', { ascending: true });

    if (error) throw error;

    let vendorHistory = [];
    if (wireReq?.vendor_id) {
      const { data: vh } = await auth.supabase
        .from('vendor_history')
        .select('*')
        .eq('vendor_id', wireReq.vendor_id)
        .order('created_at', { ascending: true });
      if (vh) vendorHistory = vh;
    }

    // Merge vendor_history into timeline based on timestamps
    const combinedTimeline = [...logs];
    vendorHistory.forEach((vh: any) => {
      combinedTimeline.push({
        id: `vh-${vh.id}`,
        action: 'VENDOR_HISTORY_SNAPSHOT',
        created_at: vh.created_at,
        event_payload: { old_data: vh.old_data, new_data: vh.new_data },
        actor: { full_name: 'System', role: 'Record' }
      });
    });

    combinedTimeline.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    const headers = new Headers();
    headers.set('Cache-Control', 'no-store');

    return NextResponse.json({ success: true, data: combinedTimeline }, { status: 200, headers });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
