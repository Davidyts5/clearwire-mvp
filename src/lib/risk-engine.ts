import { z } from 'zod';

export const RiskFactors = {
  NEW_VENDOR: { score: 50, reason: "New/Unrecognized Vendor" },
  HIGH_AMOUNT: { score: 40, reason: "High Value Transaction (>$100k)" },
  BANK_CHANGED: { score: 100, reason: "CRITICAL: Vendor Bank Account / IBAN Changed" },
  SWIFT_CHANGED: { score: 100, reason: "CRITICAL: Vendor SWIFT/BIC Routing Changed" },
  AFTER_HOURS: { score: 20, reason: "Request submitted outside standard business hours" },
  INTERNATIONAL: { score: 30, reason: "International Wire Destination" },
  VELOCITY_SPIKE: { score: 60, reason: "Unusual volume of requests for this vendor in 24h" },
  DUPLICATE_AMOUNT: { score: 45, reason: "Identical amount wired to this vendor recently" }
};

interface WirePayload {
  company_id: string;
  vendor_id?: string;
  vendor_name: string;
  amount: number;
  purpose: string;
  destination_country?: string; 
  account_number?: string;
  swift_bic?: string;
}

interface RiskResult {
  totalScore: number;
  reasons: string[];
  recommendedStatus: 'pending' | 'frozen';
}

export async function evaluateWireRisk(dbClient: any, payload: WirePayload): Promise<RiskResult> {
  let score = 10; 
  let reasons: string[] = [];

  if (payload.amount > 100000) {
    score += RiskFactors.HIGH_AMOUNT.score;
    reasons.push(RiskFactors.HIGH_AMOUNT.reason);
  }

  const currentHour = new Date().getHours();
  if (currentHour < 7 || currentHour > 19) {
    score += RiskFactors.AFTER_HOURS.score;
    reasons.push(RiskFactors.AFTER_HOURS.reason);
  }

  if (payload.destination_country && payload.destination_country !== 'US') {
    score += RiskFactors.INTERNATIONAL.score;
    reasons.push(`${RiskFactors.INTERNATIONAL.reason} (${payload.destination_country})`);
  }

  if (payload.vendor_id) {
    // BANKING INTELLIGENCE CHECK (The 100-Point Freeze)
    const { data: vendorRec } = await dbClient
      .from('vendors')
      .select('account_number, swift_bic')
      .eq('id', payload.vendor_id)
      .single();

    if (vendorRec) {
      if (payload.account_number && vendorRec.account_number && payload.account_number !== vendorRec.account_number) {
        score += RiskFactors.BANK_CHANGED.score;
        reasons.push(`${RiskFactors.BANK_CHANGED.reason} (Expected: *${vendorRec.account_number.slice(-4)}, Received: *${payload.account_number.slice(-4)})`);
      }
      if (payload.swift_bic && vendorRec.swift_bic && payload.swift_bic !== vendorRec.swift_bic) {
        score += RiskFactors.SWIFT_CHANGED.score;
        reasons.push(RiskFactors.SWIFT_CHANGED.reason);
      }
    }

    // Historical anomalies
    const { data: vendorHistory } = await dbClient
      .from('wire_requests')
      .select('amount, created_at, status')
      .eq('vendor_id', payload.vendor_id)
      .eq('company_id', payload.company_id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (vendorHistory && vendorHistory.length > 0) {
      const recentDuplicate = vendorHistory.find((w: any) => 
        w.amount === payload.amount && 
        (new Date().getTime() - new Date(w.created_at).getTime()) < 30 * 24 * 60 * 60 * 1000 
      );
      if (recentDuplicate) {
        score += RiskFactors.DUPLICATE_AMOUNT.score;
        reasons.push(RiskFactors.DUPLICATE_AMOUNT.reason);
      }
      
      const last24hCount = vendorHistory.filter((w: any) => 
        (new Date().getTime() - new Date(w.created_at).getTime()) < 24 * 60 * 60 * 1000
      ).length;
      
      if (last24hCount >= 3) {
        score += RiskFactors.VELOCITY_SPIKE.score;
        reasons.push(`${RiskFactors.VELOCITY_SPIKE.reason} (${last24hCount} requests in 24h)`);
      }
    }
  } else {
    score += RiskFactors.NEW_VENDOR.score;
    reasons.push(RiskFactors.NEW_VENDOR.reason);
  }

  const finalScore = Math.min(score, 100);
  const recommendedStatus = finalScore >= 90 ? 'frozen' : 'pending';

  return { totalScore: finalScore, reasons, recommendedStatus };
}
