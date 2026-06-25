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
  destination_country: z.string().length(2).optional().or(z.literal('')),
  bank_account_last_four: z.string().length(4).optional().or(z.literal(''))
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

    // FIX: Extract form data instead of JSON to support multipart/form-data for file uploads
    const formData = await req.formData();
    
    // Parse standard fields
    const payload = {
      vendor: formData.get("vendor") as string,
      amount: formData.get("amount") as string,
      purpose: formData.get("purpose") as string,
      bank_account_last_four: formData.get("bank_account_last_four") as string || undefined,
      destination_country: formData.get("destination_country") as string || undefined,
    };

    const validationResult = WireSchema.safeParse(payload);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues.map(i => `${i.path[0]}: ${i.message}`).join(', ');
      return NextResponse.json({ error: `Validation Error - ${errorMessage}` }, { status: 400 });
    }
    
    const parsed = validationResult.data;

    // 1. Process Invoice Upload (If present)
    const invoiceFile = formData.get("invoice") as File;
    let storedInvoicePath = null;
    let invoiceRiskPenalty = 0;
    
    if (invoiceFile && invoiceFile.size > 0) {
      // Security: Hard limit at 2MB to protect Free Tier economics
      if (invoiceFile.size > 2 * 1024 * 1024) {
        return NextResponse.json({ error: 'Invoice file exceeds 2MB limit.' }, { status: 400 });
      }
      
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
      if (!allowedTypes.includes(invoiceFile.type)) {
        return NextResponse.json({ error: 'Invalid file type. Only PDF, JPG, and PNG are allowed.' }, { status: 400 });
      }

      // Generate secure path: companyId/timestamp_filename
      const fileExt = invoiceFile.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${auth.companyId}/${fileName}`;

      const { data: uploadData, error: uploadError } = await auth.supabase.storage
        .from('invoices')
        .upload(filePath, invoiceFile, { cacheControl: '3600', upsert: false });

      if (uploadError) {
        console.error("Storage Error:", uploadError);
        return NextResponse.json({ error: `Failed to upload invoice. Is the 'invoices' bucket created?` }, { status: 500 });
      }
      
      storedInvoicePath = uploadData.path;
    } else {
      // Risk Engine Integration: Add a mild penalty if the clerk doesn't attach an invoice for high-value wires.
      if (parseFloat(parsed.amount) > 5000) {
        invoiceRiskPenalty = 15;
      }
    }

    // 2. Process Vendor & Risk
    const { data: vendorData } = await auth.supabase
      .from('vendors')
      .select('id, account_last_four')
      .eq('name', parsed.vendor)
      .eq('company_id', auth.companyId)
      .single();

    let finalVendorId = vendorData?.id;

    if (!vendorData) {
      const { data: newVendor, error: vendorInsertError } = await auth.supabase.from('vendors').insert([{ 
        company_id: auth.companyId, 
        name: parsed.vendor,
        account_last_four: parsed.bank_account_last_four || null
      }]).select().single();
      
      if (vendorInsertError) return NextResponse.json({ error: `Database missing vendors table.` }, { status: 500 });
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

    // Add invoice absence penalty if applicable
    if (invoiceRiskPenalty > 0) {
      riskAnalysis.totalScore += invoiceRiskPenalty;
      riskAnalysis.reasons.push("Missing Source Document (No Invoice Attached)");
      if (riskAnalysis.totalScore >= 90) riskAnalysis.recommendedStatus = 'frozen';
    }

    const phrases = ["PURPLE ELEPHANT BATTERY", "RED SUNSET OCEAN", "BLUE MOUNTAIN CABIN", "YELLOW TIGER STRIPE", "SILVER COFFEE MUG"];
    const antiAiPhrase = phrases[Math.floor(Math.random() * phrases.length)];

    // 3. Insert Wire Request with Invoice Path
    const { data: requestData, error: dbError } = await auth.supabase.from('wire_requests').insert([{
      company_id: auth.companyId,
      vendor_id: finalVendorId,
      vendor_name: parsed.vendor, 
      vendor_name_snapshot: parsed.vendor,
      account_number_snapshot: parsed.bank_account_last_four,
      invoice_path: storedInvoicePath, // NEW INVOICE FIELD
      amount: parseFloat(parsed.amount),
      purpose: parsed.purpose,
      risk_score: riskAnalysis.totalScore,
      risk_reasons: JSON.stringify(riskAnalysis.reasons),
      clerk_id: auth.userId,
      status: riskAnalysis.recommendedStatus,
      anti_ai_phrase: antiAiPhrase 
    }]).select().single();

    if (dbError) {
      console.error(dbError);
      return NextResponse.json({ error: `Database Error: Check if 'invoice_path' column exists.` }, { status: 500 });
    }

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
      } catch (e) {}
    }

    return NextResponse.json({ success: true, data: requestData, risk: riskAnalysis });
  } catch (error: any) {
    console.error("Route catch block:", error);
    return NextResponse.json({ error: 'Server error parsing request' }, { status: 500 });
  }
});
