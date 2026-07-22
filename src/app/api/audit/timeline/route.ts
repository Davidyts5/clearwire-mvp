export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { ROLES } from '@/lib/roles';

// Only Auditors and CFOs have forensic timeline access
export const GET = withAuth([ROLES.AUDITOR, ROLES.CFO], async (req, ctx, auth) => {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const actorId = searchParams.get('actorId');
    const actionFilter = searchParams.get('action');
    const limit = Math.min(Number(searchParams.get('limit')) || 100, 500);

    let query = auth.supabase
      .from('audit_logs')
      .select(`
        id,
        wire_id,
        action,
        previous_hash,
        new_hash,
        event_payload,
        created_at,
        actor:actor_id (full_name, role)
      `)
      .eq('company_id', auth.companyId);

    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate);
    if (actorId) query = query.eq('actor_id', actorId);
    if (actionFilter) query = query.eq('action', actionFilter);

    // For company-wide, we usually order descending for dashboard views
    const { data: logs, error } = await query.order('created_at', { ascending: false }).order('id', { ascending: false }).limit(limit);

    if (error) throw error;

    const headers = new Headers();
    headers.set('Cache-Control', 'no-store');

    return NextResponse.json({ success: true, data: logs }, { status: 200, headers });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
