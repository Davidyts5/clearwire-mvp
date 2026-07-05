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
  address: z.string().optional().or(z.literal(''))
});

// Fetch the Master Vendor List for the Clerk Dashboard
export const GET = withAuth([...ROLE_VALUES], async (req, ctx, auth) => {
  try {
    const { data, error } = await auth.supabase
      .from('vendors')
      .select('id, name, account_name, account_number, bank_name, swift_bic, country, currency, contact_email, status, address')
      .eq('company_id', auth.companyId)
      .order('name', { ascending: true });

    if (error) throw error;

    const headers = new Headers();
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

    return NextResponse.json({ success: true, data }, { status: 200, headers });
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
