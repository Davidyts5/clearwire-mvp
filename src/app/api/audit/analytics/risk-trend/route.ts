export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { ROLES } from '@/lib/roles';

export const GET = withAuth([ROLES.AUDITOR, ROLES.CFO], async (req, { params }, auth) => {
  try {
    const { searchParams } = new URL(req.url);
    const bucket = searchParams.get('bucket') || 'day'; // 'day' or 'week'
    
    // Default to last 30 days if no date provided
    const defaultStart = new Date();
    defaultStart.setDate(defaultStart.getDate() - 30);
    const startDate = searchParams.get('startDate') || defaultStart.toISOString();
    const endDate = searchParams.get('endDate') || new Date().toISOString();

    const { data: wires, error } = await auth.supabase
      .from('wire_requests')
      .select('created_at, risk_score, risk_reasons')
      .eq('company_id', auth.companyId)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (error) throw error;

    const buckets: Record<string, { totalScore: number; maxScore: number; count: number; reasons: Record<string, number> }> = {};

    wires.forEach(wire => {
      const d = new Date(wire.created_at);
      let bucketKey = '';
      if (bucket === 'week') {
        // Simple week bucket (start of ISO week)
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const weekStart = new Date(d.setDate(diff));
        bucketKey = weekStart.toISOString().split('T')[0];
      } else {
        bucketKey = d.toISOString().split('T')[0];
      }

      if (!buckets[bucketKey]) {
        buckets[bucketKey] = { totalScore: 0, maxScore: 0, count: 0, reasons: {} };
      }

      const b = buckets[bucketKey];
      b.totalScore += wire.risk_score;
      b.count += 1;
      if (wire.risk_score > b.maxScore) {
        b.maxScore = wire.risk_score;
      }

      if (wire.risk_reasons) {
        try {
          const parsedReasons = JSON.parse(wire.risk_reasons);
          parsedReasons.forEach((r: any) => {
            let code = 'UNCATEGORIZED';
            if (typeof r === 'object' && r !== null && r.code) {
              code = r.code;
            }
            b.reasons[code] = (b.reasons[code] || 0) + 1;
          });
        } catch (e) {
          // ignore parsing errors
        }
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

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
