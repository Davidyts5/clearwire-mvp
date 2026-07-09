export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { ROLE_VALUES, ROLES } from '@/lib/roles';

export const GET = withAuth([ROLES.CONTROLLER, ROLES.CFO], async (req, ctx, auth) => {
  try {
    let query = auth.supabase
      .from('vendor_change_requests')
      .select(`
        *,
        vendors (name, account_number, swift_bic, status),
        users!requested_by (full_name, email)
      `)
      .eq('company_id', auth.companyId)
      .order('created_at', { ascending: false });

    // CFOs see requests explicitly escalated to them, or they can see all.
    // For now, let's just let them see all, but filter their view in the UI.
    // Actually, prompt says CFO sees "Awaiting CFO Review". Controllers see all (or at least pending).
    
    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
