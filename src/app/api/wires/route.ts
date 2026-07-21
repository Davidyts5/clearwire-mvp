export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { z } from 'zod';
import twilio from 'twilio';
import { evaluateWireRisk } from '@/lib/risk-engine';
import { createNotification, NOTIFICATION_TYPES } from '@/lib/notifications';
import { withAuth, getAdminClient } from '@/lib/api-auth';
import { ROLES, ROLE_VALUES } from '@/lib/roles';
import { checkRateLimit } from '@/lib/rate-limit';

const WireSchema = z.object({
  vendor: z.string().min(1, "Vendor name is required"),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Must be a valid dollar amount"),
  purpose: z.string().min(1, "Purpose is required"),
  destination_country: z.string().length(2).optional().or(z.literal('')),
  account_number: z.string().optional().or(z.literal('')),
  swift_bic: z.string().optional().or(z.literal(''))
});

export const GET = withAuth([...ROLE_VALUES], async (req, ctx, auth) => {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get('limit')) || 50, 100);
  const offset = Number(searchParams.get('offset')) || 0;

  let query = auth.supabase.from('wire_requests').select('*').eq('company_id', auth.companyId).order('created_at', { ascending: false });
  if (auth.role === ROLES.CLERK) query = query.eq('clerk_id', auth.userId);

  // Fetch one extra row to detect if there's a next page, without a second query.
  const { data, error } = await query.range(offset, offset + limit);
  if (error) return NextResponse.json({ error: 'Database error' }, { status: 500 });

  const hasMore = data.length > limit;
  return NextResponse.json({ success: true, data: data.slice(0, limit), hasMore });
});


export const POST = withAuth([ROLES.CLERK], async (req, ctx, auth) => {
  try {
    const isAllowed = await checkRateLimit(`wires_${auth.userId}`, 5, 60000);
    if (!isAllowed) return NextResponse.json({ error: 'Rate limit exceeded. Please wait 60 seconds.' }, { status: 429 });

    const formData = await req.formData();
    
    const payload = {
      vendor: formData.get("vendor") as string,
      amount: formData.get("amount") as string,
      purpose: formData.get("purpose") as string,
      account_number: formData.get("account_number") as string || undefined,
      swift_bic: formData.get("swift_bic") as string || undefined,
      destination_country: formData.get("destination_country") as string || undefined,
    };

    const validationResult = WireSchema.safeParse(payload);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues.map(i => `${i.path[0]}: ${i.message}`).join(', ');
      return NextResponse.json({ error: `Validation Error - ${errorMessage}` }, { status: 400 });
    }
    
    const parsed = validationResult.data;
    const vendorTrimmed = parsed.vendor.trim();

    const invoiceFile = formData.get("invoice") as File;
    let storedInvoicePath = null;
    let invoiceRiskPenalty = 0;
    
    if (invoiceFile && invoiceFile.size > 0) {
      if (invoiceFile.size > 2 * 1024 * 1024) return NextResponse.json({ error: 'Invoice file exceeds 2MB limit.' }, { status: 400 });
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
      if (!allowedTypes.includes(invoiceFile.type)) return NextResponse.json({ error: 'Invalid file type. Only PDF, JPG, and PNG are allowed.' }, { status: 400 });

      const fileExt = invoiceFile.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${auth.companyId}/${fileName}`;

      const { data: uploadData, error: uploadError } = await auth.supabase.storage
        .from('invoices')
        .upload(filePath, invoiceFile, { cacheControl: '3600', upsert: false });

      if (uploadError) return NextResponse.json({ error: `Failed to upload invoice. Is the 'invoices' bucket created?` }, { status: 500 });
      storedInvoicePath = uploadData.path;
    } else {
      if (parseFloat(parsed.amount) > 5000) invoiceRiskPenalty = 15;
    }

    // Fix 1: Case-insensitive vendor lookup
    const { data: vendorData } = await auth.supabase
      .from('vendors')
      .select('id, name, account_number, status')
      .ilike('name', vendorTrimmed)
      .eq('company_id', auth.companyId)
      .single();

    // If an insensitive match is found but the exact casing/spacing is different, require confirmation to avoid missing fraud.
    if (vendorData && vendorData.name !== vendorTrimmed) {
        return NextResponse.json({ 
            error: `Vendor name mismatch: Did you mean "${vendorData.name}"? Please use the exact existing vendor name or confirm this is a separate vendor.` 
        }, { status: 409 });
    }

    if (vendorData?.status === "restricted") return NextResponse.json({ error: "This vendor is restricted and cannot be used for new wires." }, { status: 403 });

    let finalVendorId = vendorData?.id;

    if (!vendorData) {
      const { data: newVendor, error: vendorInsertError } = await auth.supabase.from('vendors').insert([{ 
        company_id: auth.companyId, 
        name: vendorTrimmed,
        account_number: parsed.account_number || null,
        swift_bic: parsed.swift_bic || null
      }]).select().single();
      
      if (vendorInsertError) {
        // Fix 5: Handle concurrent insertion race condition properly instead of generic DB missing error
        if (vendorInsertError.code === '23505') { // Postgres Unique Violation
            const { data: existingVendor } = await auth.supabase
                .from('vendors')
                .select('id')
                .ilike('name', vendorTrimmed)
                .eq('company_id', auth.companyId)
                .single();
            if (existingVendor) finalVendorId = existingVendor.id;
            else return NextResponse.json({ error: `Database race condition could not be resolved.` }, { status: 500 });
        } else {
            return NextResponse.json({ error: `Failed to create vendor: ${vendorInsertError.message}` }, { status: 500 });
        }
      } else {
          finalVendorId = newVendor?.id;
      }
    }

    const riskAnalysis = await evaluateWireRisk(auth.supabase, {
      company_id: auth.companyId,
      vendor_id: finalVendorId,
      vendor_name: vendorTrimmed,
      amount: parseFloat(parsed.amount),
      purpose: parsed.purpose,
      destination_country: parsed.destination_country,
      account_number: parsed.account_number,
      has_invoice: !!storedInvoicePath,
      swift_bic: parsed.swift_bic
    });

    const phrases = ["PURPLE ELEPHANT BATTERY", "RED SUNSET OCEAN", "BLUE MOUNTAIN CABIN", "YELLOW TIGER STRIPE", "SILVER COFFEE MUG"];
    const antiAiPhrase = phrases[Math.floor(Math.random() * phrases.length)];

    const { data: requestData, error: dbError } = await auth.supabase.from('wire_requests').insert([{
      company_id: auth.companyId,
      vendor_id: finalVendorId,
      vendor_name_snapshot: vendorTrimmed,
      vendor_name: vendorTrimmed,
      account_number_snapshot: parsed.account_number,
      swift_bic_snapshot: parsed.swift_bic,
      invoice_path: storedInvoicePath,
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
      } catch (e) {}
    }

    
    const adminClient = await getAdminClient();
    if (riskAnalysis.recommendedStatus === 'frozen') {
      const { data: cfoUsers } = await adminClient.from('users').select('id').eq('company_id', auth.companyId).eq('role', ROLES.CFO);
      if (cfoUsers) {
        for (const cfo of cfoUsers) {
          await createNotification(adminClient, {
            companyId: auth.companyId,
            userId: cfo.id,
            type: NOTIFICATION_TYPES.WIRE_FROZEN,
            title: 'Risk Engine Freeze',
            message: `A wire to ${parsed.vendor} was automatically frozen. Risk Score: ${riskAnalysis.totalScore}`,
            actionUrl: `/approve/${requestData.id}`,
            metadata: { wireAmount: parsed.amount, vendorName: parsed.vendor, riskScore: riskAnalysis.totalScore },
            relatedWireId: requestData.id,
          });
        }
      }
    } else {
      const { data: controllers } = await adminClient.from('users').select('id').eq('company_id', auth.companyId).eq('role', ROLES.CONTROLLER);
      if (controllers) {
        for (const c of controllers) {
          await createNotification(adminClient, {
            companyId: auth.companyId,
            userId: c.id,
            type: NOTIFICATION_TYPES.WIRE_PENDING_APPROVAL,
            title: 'New Wire Request',
            message: `A wire to ${parsed.vendor} is awaiting your signature.`,
            actionUrl: `/approve/${requestData.id}`,
            metadata: { wireAmount: parsed.amount, vendorName: parsed.vendor },
            relatedWireId: requestData.id,
          });
        }
      }
    }
    return NextResponse.json({ success: true, data: requestData, risk: riskAnalysis });
  } catch (error: any) {
    return NextResponse.json({ error: 'Server error parsing request' }, { status: 500 });
  }
});