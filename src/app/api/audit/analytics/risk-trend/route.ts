export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { ROLES } from '@/lib/roles';

export async function getRiskTrendData(supabase: any, companyId: string, bucket: string, startDate: string, endDate: string) {
  let offset = 0;
  const limit = 1000;
  const wires = [];

  while (true) {
    let query = supabase
      .from('wire_requests')
      .select('created_at, risk_score, risk_reasons, status')
      .eq('company_id', companyId)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    const { data, error } = await query.order('created_at', { ascending: true }).order('id', { ascending: true }).range(offset, offset + limit - 1);
    if (error) throw error;
    wires.push(...data);
    if (data.length < limit) break;
    offset += limit;
  }

  const buckets: Record<string, { totalScore: number; maxScore: number; count: number; reasons: Record<string, number> }> = {};
  const totals = {
    totalWires: wires.length,
    statusCounts: { approved: 0, denied: 0, pending: 0, under_review: 0, frozen: 0 } as Record<string, number>,
    
    reasons: {} as Record<string, number>
  };

  wires.forEach(wire => {
    if (totals.statusCounts[wire.status] !== undefined) {
      totals.statusCounts[wire.status]++;
    } else {
      totals.statusCounts[wire.status] = 1;
    }
    

    const d = new Date(wire.created_at);
    let bucketKey = '';
    if (bucket === 'week') {
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const weekStart = new Date(d.setDate(diff));
      bucketKey = weekStart.toISOString().split('T')[0];
    } else {
      bucketKey = d.toISOString().split('T')[0];
    }

    if (!buckets[bucketKey]) buckets[bucketKey] = { totalScore: 0, maxScore: 0, count: 0, reasons: {} };
    const b = buckets[bucketKey];
    b.totalScore += wire.risk_score;
    b.count += 1;
    if (wire.risk_score > b.maxScore) b.maxScore = wire.risk_score;

    if (wire.risk_reasons) {
      try {
        const parsedReasons = typeof wire.risk_reasons === 'string' ? JSON.parse(wire.risk_reasons) : wire.risk_reasons;
        parsedReasons.forEach((r: any) => {
          let code = 'UNCATEGORIZED';
          if (typeof r === 'object' && r !== null && r.code) code = r.code;
          b.reasons[code] = (b.reasons[code] || 0) + 1;
          totals.reasons[code] = (totals.reasons[code] || 0) + 1;
        });
      } catch (e) {}
    }
  });

  const result = Object.keys(buckets).sort().map(key => {
    const b = buckets[key];
    return {
      bucket: key,
      avg_risk_score: b.count > 0 ? Math.round(b.totalScore / b.count) : 0,
      max_risk_score: b.maxScore,
      wire_count: b.count,
      reasons_breakdown: b.reasons
    };
  });

  return { buckets: result, totals };
}

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
