export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { ROLES } from '@/lib/roles';
import { getRiskTrendData } from '@/lib/analytics-utils';

export const GET = withAuth([ROLES.AUDITOR, ROLES.CFO], async (req, { params }, auth) => {
  try {
    const { searchParams } = new URL(req.url);
    const bucket = searchParams.get('bucket') || 'day';
    const defaultStart = new Date();
    defaultStart.setDate(defaultStart.getDate() - 30);
    const startDate = searchParams.get('startDate') || defaultStart.toISOString();
    const endDate = searchParams.get('endDate') || new Date().toISOString();

    const data = await getRiskTrendData(auth.supabase, auth.companyId, bucket, startDate, endDate);
    return NextResponse.json({ success: true, data: data.buckets });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
