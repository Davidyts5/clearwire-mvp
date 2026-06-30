import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { ROLE_VALUES } from '@/lib/roles';

// Fetch the Master Vendor List for the Clerk Dashboard
export const GET = withAuth([...ROLE_VALUES], async (req, ctx, auth) => {
  try {
    const { data, error } = await auth.supabase
      .from('vendors')
      .select('id, name, account_name, account_number, bank_name, swift_bic')
      .eq('company_id', auth.companyId)
      .order('name', { ascending: true });

    if (error) throw error;

    const headers = new Headers();
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

    return NextResponse.json({ success: true, data }, { status: 200, headers });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
