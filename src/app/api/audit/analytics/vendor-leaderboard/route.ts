export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { ROLES } from '@/lib/roles';
import { getVendorLeaderboardData } from '@/lib/analytics-utils';

export const GET = withAuth([ROLES.AUDITOR, ROLES.CFO], async (req, { params }, auth) => {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    const result = await getVendorLeaderboardData(auth.supabase, auth.companyId, startDate, endDate);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
