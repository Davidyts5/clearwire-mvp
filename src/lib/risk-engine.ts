// ENTERPRISE RISK ENGINE (v3.0)
// Modular, extensible risk assessment for B2B wire transfers

import { supabase } from '@/lib/supabase/server'; // Assumes initialized SSR client
import { z } from 'zod';

export const RiskFactors = {
  NEW_VENDOR: { score: 50, reason: "New/Unrecognized Vendor" },
  HIGH_AMOUNT: { score: 40, reason: "High Value Transaction (>$100k)" },
  BANK_CHANGED: { score: 80, reason: "Vendor Bank Account Changed Recently" },
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
  destination_country?: string; // e.g., 'US', 'GB', 'CN'
  bank_account_last_four?: string;
}

interface RiskResult {
  totalScore: number;
  reasons: string[];
  recommendedStatus: 'pending' | 'frozen';
}

export async function evaluateWireRisk(dbClient: any, payload: WirePayload): Promise<RiskResult> {
  let score = 10; // Base baseline risk
  let reasons: string[] = [];

  // 1. AMOUNT CHECK
  if (payload.amount > 100000) {
    score += RiskFactors.HIGH_AMOUNT.score;
    reasons.push(RiskFactors.HIGH_AMOUNT.reason);
  }

  // 2. TIME OF DAY CHECK (After Hours Anomaly)
  const currentHour = new Date().getHours();
  // Standard business hours: 7 AM to 7 PM
  if (currentHour < 7 || currentHour > 19) {
    score += RiskFactors.AFTER_HOURS.score;
    reasons.push(RiskFactors.AFTER_HOURS.reason);
  }

  // 3. INTERNATIONAL DESTINATION CHECK
  if (payload.destination_country && payload.destination_country !== 'US') {
    score += RiskFactors.INTERNATIONAL.score;
    reasons.push(`${RiskFactors.INTERNATIONAL.reason} (${payload.destination_country})`);
  }

  // Database-dependent checks
  if (payload.vendor_id) {
    // Fetch historical data for this vendor
    const { data: vendorHistory } = await dbClient
      .from('wire_requests')
      .select('amount, created_at, status')
      .eq('vendor_id', payload.vendor_id)
      .eq('company_id', payload.company_id)
      .order('created_at', { ascending: false })
      .limit(10);

    // 4. DUPLICATE INVOICE / AMOUNT CHECK
    if (vendorHistory && vendorHistory.length > 0) {
      const recentDuplicate = vendorHistory.find((w: any) => 
        w.amount === payload.amount && 
        (new Date().getTime() - new Date(w.created_at).getTime()) < 30 * 24 * 60 * 60 * 1000 // Within 30 days
      );
      if (recentDuplicate) {
        score += RiskFactors.DUPLICATE_AMOUNT.score;
        reasons.push(RiskFactors.DUPLICATE_AMOUNT.reason);
      }
    }

    // 5. VELOCITY ANOMALY (Unusual Transfer Pattern)
    if (vendorHistory) {
      const last24hCount = vendorHistory.filter((w: any) => 
        (new Date().getTime() - new Date(w.created_at).getTime()) < 24 * 60 * 60 * 1000
      ).length;
      
      if (last24hCount >= 3) {
        score += RiskFactors.VELOCITY_SPIKE.score;
        reasons.push(`${RiskFactors.VELOCITY_SPIKE.reason} (${last24hCount} requests in 24h)`);
      }
    }

    // 6. BANK ACCOUNT CHANGE DETECTION
    const { data: vendorRec } = await dbClient
      .from('vendors')
      .select('account_last_four, updated_at')
      .eq('id', payload.vendor_id)
      .single();

    if (vendorRec && payload.bank_account_last_four) {
      if (vendorRec.account_last_four && vendorRec.account_last_four !== payload.bank_account_last_four) {
        score += RiskFactors.BANK_CHANGED.score;
        reasons.push(`${RiskFactors.BANK_CHANGED.reason} (Expected: *${vendorRec.account_last_four}, Received: *${payload.bank_account_last_four})`);
      }
    }

  } else {
    // 7. BRAND NEW VENDOR
    score += RiskFactors.NEW_VENDOR.score;
    reasons.push(RiskFactors.NEW_VENDOR.reason);
  }

  // Cap score at 100
  const finalScore = Math.min(score, 100);

  // Policy Engine: Determine if human intervention is required before normal workflow
  const recommendedStatus = finalScore >= 90 ? 'frozen' : 'pending';

  return {
    totalScore: finalScore,
    reasons,
    recommendedStatus
  };
}
