import { NextResponse } from 'next/server';
import { z } from 'zod';
import twilio from 'twilio';
import { evaluateWireRisk } from '@/lib/risk-engine';
import { withAuth } from '@/lib/api-auth';

const WireSchema = z.object({
  vendor: z.string().min(2),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  purpose: z.string().min(5),
  destination_country: z.string().length(2).optional(),
  bank_account_last_four: z.string().length(4).optional()
});

export const GET = withAuth(['clerk', 'controller', 'cfo', 'auditor'], async (req, ctx, auth) => {
  const { data, error } = await auth.supabase
    .from('wire_requests')
    .select('*')
    .eq('company_id', auth.companyId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: 'Database error' }, { status: 500 });
  return NextResponse.json({ success: true, data });
});

export const POST = withAuth(['clerk', 'controller'], async (req, ctx, auth) => {
  const body = await req.json();
  const parsed = WireSchema.parse(body);

  const { data: vendorData } = await auth.supabase
    .from('vendors')
    .select('id, account_last_four')
    .eq('name', parsed.vendor)
    .eq('company_id', auth.companyId)
    .single();

  let finalVendorId = vendorData?.id;

  if (!vendorData) {
    const { data: newVendor } = await auth.supabase.from('vendors').insert([{ 
      company_id: auth.companyId, 
      name: parsed.vendor,
      account_last_four: parsed.bank_account_last_four 
    }]).select().single();
    finalVendorId = newVendor?.id;
  }

  const riskAnalysis = await evaluateWireRisk(auth.supabase, {
    company_id: auth.companyId,
    vendor_id: finalVendorId,
    vendor_name: parsed.vendor,
    amount: parseFloat(parsed.amount),
    purpose: parsed.purpose,
    destination_country: parsed.destination_country,
    bank_account_last_four: parsed.bank_account_last_four
  });

  const { data: requestData, error: dbError } = await auth.supabase.from('wire_requests').insert([{
    company_id: auth.companyId,
    vendor_id: finalVendorId,
    vendor_name_snapshot: parsed.vendor,
    amount: parseFloat(parsed.amount),
    purpose: parsed.purpose,
    risk_score: riskAnalysis.totalScore,
    risk_reasons: JSON.stringify(riskAnalysis.reasons), // Stringify for JSONB compatibility
    clerk_id: auth.userId,
    status: riskAnalysis.recommendedStatus
  }]).select().single();

  if (dbError) {
    console.error("DB Insert Error:", dbError);
    return NextResponse.json({ error: `Database insert failed: Please ensure schema is synced.` }, { status: 500 });
  }

  await auth.supabase.from('audit_logs').insert([{
    company_id: auth.companyId,
    wire_id: requestData.id,
    actor_id: auth.userId,
    action: 'CREATED',
    new_hash: 'INITIAL_STATE'
  }]);

  if (riskAnalysis.recommendedStatus !== 'frozen' && process.env.TWILIO_SID) {
    try {
      const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
      const host = req.headers.get('host') || 'localhost:3000';
      await client.messages.create({
        body: `CLEARWIRE [Risk: ${riskAnalysis.totalScore}]: Wire request $${parsed.amount} to ${parsed.vendor}. Tap to sign: https://${host}/approve/${requestData.id}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: process.env.CFO_PHONE_NUMBER!
      });
    } catch (e) {
      console.error("Twilio warning:", e);
    }
  }

  return NextResponse.json({ success: true, data: requestData, risk: riskAnalysis });
});
