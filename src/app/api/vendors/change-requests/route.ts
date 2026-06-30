import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { ROLES } from '@/lib/roles';

export const GET = withAuth([ROLES.CONTROLLER, ROLES.CFO, ROLES.AUDITOR], async (req, ctx, auth) => {
  try {
    const { data, error } = await auth.supabase
      .from('vendor_change_requests')
      .select('*, vendors(name), users!vendor_change_requests_requested_by_fkey(full_name)')
      .eq('company_id', auth.companyId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const headers = new Headers();
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

    return NextResponse.json({ success: true, data }, { status: 200, headers });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
