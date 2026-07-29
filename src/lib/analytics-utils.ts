import { RiskFactors } from '@/lib/risk-engine';

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
