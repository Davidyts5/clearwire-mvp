import { z } from 'zod';
import Decimal from 'decimal.js';

export const RiskFactors = {
  NEW_VENDOR: { score: 50, reason: "New/Unrecognized Vendor" },
  HIGH_AMOUNT: { score: 40, reason: "High Value Transaction (>$100k)" },
  BANK_CHANGED: { score: 100, reason: "CRITICAL: Vendor Bank Account / IBAN Changed" },
  SWIFT_CHANGED: { score: 100, reason: "CRITICAL: Vendor SWIFT/BIC Routing Changed" },
  AFTER_HOURS: { score: 20, reason: "Request submitted outside standard business hours" },
  INTERNATIONAL: { score: 30, reason: "International Wire Destination" },
  VELOCITY_SPIKE: { score: 60, reason: "Unusual volume of requests for this vendor in 24h" },
  DUPLICATE_AMOUNT: { score: 45, reason: "Identical amount wired to this vendor recently" },
  HIGH_RISK_COUNTRY: { score: 100, reason: "CRITICAL: Destination country flagged as high-risk" },
  POLICY_NO_INVOICE: { score: 100, reason: "POLICY VIOLATION: Missing Source Document (No Invoice Attached)" },
  POLICY_FIRST_PAYMENT: { score: 100, reason: "POLICY VIOLATION: First payment to a new vendor requires executive review" },
  POLICY_BANK_CHANGE: { score: 100, reason: "POLICY VIOLATION: Vendor banking changes explicitly require executive authorization" },
  POLICY_INTERNATIONAL: { score: 100, reason: "POLICY VIOLATION: International wires explicitly require executive authorization" },
  POLICY_ABOVE_THRESHOLD: { score: 100, reason: "POLICY VIOLATION: Wire amount exceeds CFO auto-freeze threshold" }
};

interface WirePayload {
  company_id: string;
  vendor_id?: string;
  vendor_name: string;
  amount: number | string; // Accept string from upstream to avoid precision loss parsing float early
  purpose: string;
  destination_country?: string; 
  account_number?: string;
  swift_bic?: string;
  has_invoice?: boolean;
}

interface RiskResult {
  totalScore: number;
  reasons: { code: string; detail: string }[];
  recommendedStatus: 'pending' | 'frozen';
}

const HIGH_RISK_COUNTRY_CODES = ['RU', 'KP', 'IR', 'SY', 'CU', 'VE', 'MM'];

export async function evaluateWireRisk(dbClient: any, payload: WirePayload): Promise<RiskResult> {
  let score = 10; 
  let reasons: { code: string; detail: string }[] = [];
  
  // Fix 6: Use Decimal.js for precise currency checks
  const currentAmount = new Decimal(payload.amount);

  // 1. FETCH COMPANY POLICY SETTINGS
  const { data: settings } = await dbClient
    .from('company_settings')
    .select('*')
    .eq('company_id', payload.company_id)
    .single();

  const riskProfile = settings?.risk_profile || 'standard';
  
  // Define strictness thresholds based on profile
  let freezeThreshold = 90; // Standard
  if (riskProfile === 'conservative') freezeThreshold = 70;
  if (riskProfile === 'aggressive') freezeThreshold = 100;
  // If custom, the logic relies purely on the strict hard-toggles we evaluate below

  // 2. BASELINE ANOMALY DETECTION
  if (currentAmount.greaterThan(100000)) {
    score += RiskFactors.HIGH_AMOUNT.score;
    reasons.push({ code: 'HIGH_AMOUNT', detail: RiskFactors.HIGH_AMOUNT.reason });
  }

  const currentHour = new Date().getHours();
  if (currentHour < 7 || currentHour > 19) {
    score += RiskFactors.AFTER_HOURS.score;
    reasons.push({ code: 'AFTER_HOURS', detail: RiskFactors.AFTER_HOURS.reason });
  }

  if (payload.destination_country && payload.destination_country !== 'US') {
    score += RiskFactors.INTERNATIONAL.score;
    reasons.push({ code: 'INTERNATIONAL', detail: `${RiskFactors.INTERNATIONAL.reason} (${payload.destination_country})` });
  }

  // 3. HARD POLICY ENFORCEMENT (Custom Rules)
  if (riskProfile === 'custom') {
    if (settings.freeze_missing_invoice && !payload.has_invoice) {
      score += RiskFactors.POLICY_NO_INVOICE.score;
      reasons.push({ code: 'POLICY_NO_INVOICE', detail: RiskFactors.POLICY_NO_INVOICE.reason });
    }
    
    if (settings.freeze_international_payment && payload.destination_country && payload.destination_country !== 'US') {
      score += RiskFactors.POLICY_INTERNATIONAL.score;
      reasons.push({ code: 'POLICY_INTERNATIONAL', detail: `${RiskFactors.POLICY_INTERNATIONAL.reason} (${payload.destination_country})` });
    }

    if (settings.freeze_high_risk_countries && payload.destination_country && HIGH_RISK_COUNTRY_CODES.includes(payload.destination_country.toUpperCase())) {
      score += RiskFactors.HIGH_RISK_COUNTRY.score;
      reasons.push({ code: 'HIGH_RISK_COUNTRY', detail: `${RiskFactors.HIGH_RISK_COUNTRY.reason} (${payload.destination_country})` });
    }

    if (settings.freeze_above_amount && currentAmount.greaterThanOrEqualTo(settings.freeze_amount_threshold || 999999999)) {
      score += RiskFactors.POLICY_ABOVE_THRESHOLD.score;
      reasons.push({ code: 'POLICY_ABOVE_THRESHOLD', detail: `${RiskFactors.POLICY_ABOVE_THRESHOLD.reason} (Threshold: $${settings.freeze_amount_threshold})` });
    }
  }

  // 4. VENDOR INTELLIGENCE & HISTORY
  if (payload.vendor_id) {
    const { data: vendorRec } = await dbClient
      .from('vendors')
      .select('account_number, swift_bic')
      .eq('id', payload.vendor_id)
      .single();

    if (vendorRec) {
      let isBankChanged = false;
      if (payload.account_number && vendorRec.account_number && payload.account_number !== vendorRec.account_number) {
        score += RiskFactors.BANK_CHANGED.score;
        reasons.push({ code: 'BANK_CHANGED', detail: `${RiskFactors.BANK_CHANGED.reason} (Expected: *${vendorRec.account_number.slice(-4)}, Received: *${payload.account_number.slice(-4)})` });
        isBankChanged = true;
      }
      if (payload.swift_bic && vendorRec.swift_bic && payload.swift_bic !== vendorRec.swift_bic) {
        score += RiskFactors.SWIFT_CHANGED.score;
        reasons.push({ code: 'SWIFT_CHANGED', detail: RiskFactors.SWIFT_CHANGED.reason });
        isBankChanged = true;
      }

      if (isBankChanged && riskProfile === 'custom' && settings.freeze_bank_changes) {
        score += RiskFactors.POLICY_BANK_CHANGE.score;
        if (!reasons.some(r => r.code === 'POLICY_BANK_CHANGE')) reasons.push({ code: 'POLICY_BANK_CHANGE', detail: RiskFactors.POLICY_BANK_CHANGE.reason });
      }
    }

    const { data: vendorHistory } = await dbClient
      .from('wire_requests')
      .select('amount, created_at, status')
      .eq('vendor_id', payload.vendor_id)
      .eq('company_id', payload.company_id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!vendorHistory || vendorHistory.length === 0) {
      // It's an existing vendor in the DB, but they have zero wire history
      if (riskProfile === 'custom' && settings.freeze_first_payment) {
        score += RiskFactors.POLICY_FIRST_PAYMENT.score;
        reasons.push({ code: 'POLICY_FIRST_PAYMENT', detail: RiskFactors.POLICY_FIRST_PAYMENT.reason });
      }
    } else {
      const recentDuplicate = vendorHistory.find((w: any) => 
        new Decimal(w.amount).equals(currentAmount) && 
        (new Date().getTime() - new Date(w.created_at).getTime()) < 30 * 24 * 60 * 60 * 1000 
      );
      if (recentDuplicate) {
        score += RiskFactors.DUPLICATE_AMOUNT.score;
        reasons.push({ code: 'DUPLICATE_AMOUNT', detail: RiskFactors.DUPLICATE_AMOUNT.reason });
      }
      
      const last24hCount = vendorHistory.filter((w: any) => 
        (new Date().getTime() - new Date(w.created_at).getTime()) < 24 * 60 * 60 * 1000
      ).length;
      
      if (last24hCount >= 3) {
        score += RiskFactors.VELOCITY_SPIKE.score;
        reasons.push({ code: 'VELOCITY_SPIKE', detail: `${RiskFactors.VELOCITY_SPIKE.reason} (${last24hCount} requests in 24h)` });
      }
    }
  } else {
    // Brand new vendor
    score += RiskFactors.NEW_VENDOR.score;
    reasons.push({ code: 'NEW_VENDOR', detail: RiskFactors.NEW_VENDOR.reason });

    if (riskProfile === 'custom' && settings.freeze_first_payment) {
      score += RiskFactors.POLICY_FIRST_PAYMENT.score;
      reasons.push({ code: 'POLICY_FIRST_PAYMENT', detail: RiskFactors.POLICY_FIRST_PAYMENT.reason });
    }
  }

  const finalScore = Math.min(score, 100);
  
  // 5. DETERMINE FINAL STATUS
  let recommendedStatus: 'pending' | 'frozen' = 'pending';
  
  if (riskProfile === 'custom') {
    // If Custom, it only freezes if a hard policy explicitly pushed the score to 100
    if (finalScore >= 100) recommendedStatus = 'frozen';
  } else {
    // If standard profiles, use the dynamic threshold
    if (finalScore >= freezeThreshold) recommendedStatus = 'frozen';
  }

  return { totalScore: finalScore, reasons, recommendedStatus };
}