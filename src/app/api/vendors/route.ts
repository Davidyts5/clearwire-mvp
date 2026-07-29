export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { ROLES, ROLE_VALUES } from '@/lib/roles';
import { z } from 'zod';

// Schema for New Vendor
const NewVendorSchema = z.object({
  name: z.string().min(1, "Vendor Name is required"),
  account_name: z.string().optional(),
  account_number: z.string().min(1, "Account Number/IBAN is required"),
  swift_bic: z.string().optional(),
  country: z.string().min(1, "Country is required"),
  currency: z.string().min(1, "Currency is required"),
  contact_email: z.string().email("Invalid email").optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')), phone_number: z.string().optional().or(z.literal(''))
});

// Fetch the Master Vendor List for the Clerk Dashboard
export const GET = withAuth([...ROLE_VALUES], async (req, ctx, auth) => {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 100);
    const offset = Number(searchParams.get('offset')) || 0;


    const { data, error } = await auth.supabase
      .from('vendors')
      .select('id, name, account_name, account_number, bank_name, swift_bic, country, currency, contact_email, status, address, phone_number, created_at, vendor_change_requests(status, old_data, new_data)')
      .eq('company_id', auth.companyId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit);

    if (error) throw error;

    // Post-process to inject has_pending_bank_change
    const processedData = data.map((v: any) => {
        let hasPendingBankChange = false;
        if (v.vendor_change_requests) {
            v.vendor_change_requests.forEach((req: any) => {
                if (req.status === 'pending' || req.status === 'awaiting_cfo') {
                    const isBankChange = req.old_data?.account_number !== req.new_data?.account_number || req.old_data?.swift_bic !== req.new_data?.swift_bic;
                    if (isBankChange) hasPendingBankChange = true;
                }
            });
        }
        // Remove the heavy payload before sending to client
        delete v.vendor_change_requests;
        return { ...v, has_pending_bank_change: hasPendingBankChange };
    });


    const hasMore = data.length > limit;
    const headers = new Headers();
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

    return NextResponse.json({ success: true, data: processedData.slice(0, limit), hasMore }, { status: 200, headers });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

// Create a New Vendor
export const POST = withAuth([ROLES.CLERK], async (req, ctx, auth) => {
  try {
    const body = await req.json();
    const parsed = NewVendorSchema.parse(body);

    const { data, error } = await auth.supabase.from('vendors').insert([{
      company_id: auth.companyId,
      name: parsed.name,
      account_name: parsed.account_name,
      account_number: parsed.account_number,
      swift_bic: parsed.swift_bic,
      country: parsed.country,
      currency: parsed.currency,
      contact_email: parsed.contact_email || null,
      address: parsed.address || null,
      status: 'active'
    }]).select().single();

    if (error) {
      if (error.code === '23505') { // Unique violation
        return NextResponse.json({ error: "A vendor with this name already exists." }, { status: 400 });
      }
      throw error;
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.errors ? error.errors[0].message : error.message }, { status: 400 });
  }
});
