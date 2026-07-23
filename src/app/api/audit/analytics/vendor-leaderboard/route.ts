export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { ROLES } from '@/lib/roles';
import { RiskFactors } from '@/lib/risk-engine';

export async function getVendorLeaderboardData(supabase: any, companyId: string, startDate?: string, endDate?: string) {
  let offset = 0;
  const limit = 1000;
  const wires = [];

  while (true) {
    let query = supabase
      .from('wire_requests')
      .select('vendor_id, vendor_name_snapshot, risk_score, risk_reasons, created_at')
      .eq('company_id', companyId);

    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate);

    const { data, error } = await query.order('created_at', { ascending: true }).order('id', { ascending: true }).range(offset, offset + limit - 1);
    if (error) throw error;
    wires.push(...data);
    if (data.length < limit) break;
    offset += limit;
  }

  const vendorMap: Record<string, { vendor_id: string; vendor_name: string; total_wires: number; total_risk: number; flag_count: number; last_flagged_at: string | null; }> = {};

  wires.forEach(wire => {
    const vId = wire.vendor_id || wire.vendor_name_snapshot || 'UNKNOWN';
    const vName = wire.vendor_name_snapshot || 'Unknown Vendor';

    if (!vendorMap[vId]) {
      vendorMap[vId] = { vendor_id: wire.vendor_id, vendor_name: vName, total_wires: 0, total_risk: 0, flag_count: 0, last_flagged_at: null };
    }

    const v = vendorMap[vId];
    v.total_wires += 1;
    v.total_risk += wire.risk_score;

    let isFlagged = false;
    if (wire.risk_reasons) {
      try {
        const parsed = typeof wire.risk_reasons === 'string' ? JSON.parse(wire.risk_reasons) : wire.risk_reasons;
        parsed.forEach((r: any) => {
          if (typeof r === 'object' && r !== null) {
            if (r.code === 'BANK_CHANGED' || r.code === 'SWIFT_CHANGED') isFlagged = true;
          } else if (typeof r === 'string') {
            if (
              r.includes("Bank Account / IBAN Changed") || 
              r.includes("SWIFT/BIC Routing Changed") ||
              r.includes(RiskFactors.BANK_CHANGED.reason.split('(')[0].trim()) ||
              r.includes(RiskFactors.SWIFT_CHANGED.reason)
            ) {
              isFlagged = true;
            }
          }
        });
      } catch (e) {}
    }

    if (isFlagged) {
      v.flag_count += 1;
      if (!v.last_flagged_at || new Date(wire.created_at) > new Date(v.last_flagged_at)) {
        v.last_flagged_at = wire.created_at;
      }
    }
  });

  const result = Object.values(vendorMap).map(v => ({
    ...v,
    avg_risk_score: v.total_wires > 0 ? Math.round(v.total_risk / v.total_wires) : 0
  }));

  result.sort((a, b) => b.flag_count - a.flag_count || b.avg_risk_score - a.avg_risk_score || String(a.vendor_id).localeCompare(String(b.vendor_id)));
  return result;
}

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
