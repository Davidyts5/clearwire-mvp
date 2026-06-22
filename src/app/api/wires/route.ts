import { NextResponse } from 'next/server';
import { z } from 'zod';
import twilio from 'twilio';
import { evaluateWireRisk } from '@/lib/risk-engine';
import { withAuth } from '@/lib/api-auth';
import { ROLES, ROLE_VALUES } from '@/lib/roles';
import { checkRateLimit } from '@/lib/rate-limit';

const WireSchema = z.object({
  vendor: z.string().min(1, "Vendor name is required"),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Must be a valid dollar amount"),
  purpose: z.string().min(1, "Purpose is required"),
  account_name: z.string().optional().or(z.literal('')),
  account_number: z.string().optional().or(z.literal('')),
  bank_name: z.string().optional().or(z.literal('')),
  swift_bic: z.string().optional().or(z.literal(''))
});

export const GET = withAuth([...ROLE_VALUES], async (req, ctx, auth) => {
  let query = auth.supabase.from('wire_requests').select('*').eq('company_id', auth.companyId).order('created_at', { ascending: false });
  if (auth.role === ROLES.CLERK) query = query.eq('clerk_id', auth.userId);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'Database error' }, { status: 500 });
  return NextResponse.json({ success: true, data });
});

export const POST = withAuth([ROLES.CLERK], async (req, ctx, auth) => {
  try {
    const isAllowed = checkRateLimit(`wires_${auth.userId}`, 5, 60000);
    if (!isAllowed) return NextResponse.json({ error: 'Rate limit exceeded. Please wait 60 seconds.' }, { status: 429 });

    const body = await req.json();
    const validationResult = WireSchema.safeParse(body);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues.map(i => `${i.path[0]}: ${i.message}`).join(', ');
      return NextResponse.json({ error: `Validation Error - ${errorMessage}` }, { status: 400 });
    }
    
    const parsed = validationResult.data;

    // Check if vendor already exists to trigger strict banking checks
    const { data: vendorData } = await auth.supabase
      .from('vendors')
      .select('id')
      .eq('name', parsed.vendor)
      .eq('company_id', auth.companyId)
      .single();

    let finalVendorId = vendorData?.id;

    if (!vendorData) {
      const { data: newVendor, error: vendorInsertError } = await auth.supabase.from('vendors').insert([{ 
        company_id: auth.companyId, 
        name: parsed.vendor,
        account_name: parsed.account_name,
        account_number: parsed.account_number,
        bank_name: parsed.bank_name,
        swift_bic: parsed.swift_bic
      }]).select().single();
      
      if (vendorInsertError) return NextResponse.json({ error: `Database missing banking columns. Please run sync script.` }, { status: 500 });
      finalVendorId = newVendor?.id;
    }

    const riskAnalysis = await evaluateWireRisk(auth.supabase, {
      company_id: auth.companyId,
      vendor_id: finalVendorId,
      vendor_name: parsed.vendor,
      amount: parseFloat(parsed.amount),
      purpose: parsed.purpose,
      account_number: parsed.account_number,
      swift_bic: parsed.swift_bic
    });

    const phrases = ["PURPLE ELEPHANT BATTERY", "RED SUNSET OCEAN", "BLUE MOUNTAIN CABIN", "YELLOW TIGER STRIPE", "SILVER COFFEE MUG"];
    const antiAiPhrase = phrases[Math.floor(Math.random() * phrases.length)];

    const { data: requestData, error: dbError } = await auth.supabase.from('wire_requests').insert([{
      company_id: auth.companyId,
      vendor_id: finalVendorId,
      vendor_name: parsed.vendor, 
      vendor_name_snapshot: parsed.vendor,
      account_number_snapshot: parsed.account_number,
      swift_bic_snapshot: parsed.swift_bic,
      amount: parseFloat(parsed.amount),
      purpose: parsed.purpose,
      risk_score: riskAnalysis.totalScore,
      risk_reasons: JSON.stringify(riskAnalysis.reasons),
      clerk_id: auth.userId,
      status: riskAnalysis.recommendedStatus,
      anti_ai_phrase: antiAiPhrase 
    }]).select().single();

    if (dbError) return NextResponse.json({ error: `Database Error: ${dbError.message}` }, { status: 500 });

    await auth.supabase.from('audit_logs').insert([{
      company_id: auth.companyId, wire_id: requestData.id, actor_id: auth.userId, action: 'CREATED', new_hash: 'INITIAL_STATE'
    }]);

    if (riskAnalysis.recommendedStatus !== 'frozen' && process.env.TWILIO_SID) {
      try {
        const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
        await client.messages.create({
          body: `CLEARWIRE [Risk: ${riskAnalysis.totalScore}]: Wire request $${parsed.amount} to ${parsed.vendor}. Tap to sign: ${siteUrl}/approve/${requestData.id}`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: process.env.CFO_PHONE_NUMBER!
        });
      } catch (e) { console.error("Twilio warning:", e); }
    }

    return NextResponse.json({ success: true, data: requestData, risk: riskAnalysis });
  } catch (error: any) {
    return NextResponse.json({ error: 'Server error parsing request' }, { status: 500 });
  }
});
