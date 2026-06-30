import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { ROLE_VALUES } from '@/lib/roles';
import { z } from 'zod';

const CreateVendorSchema = z.object({
  name: z.string().min(1),
  account_name: z.string().optional().or(z.literal('')),
  account_number: z.string().optional().or(z.literal('')),
  bank_name: z.string().optional().or(z.literal('')),
  swift_bic: z.string().optional().or(z.literal('')),
  country: z.string().optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
});

export const GET = withAuth([...ROLE_VALUES], async (req, ctx, auth) => {
  try {
    const { data, error } = await auth.supabase
      .from('vendors')
      .select('*')
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

export const POST = withAuth(['clerk'], async (req, ctx, auth) => {
  try {
    const body = await req.json();
    const parsed = CreateVendorSchema.parse(body);

    const { data: newVendor, error: dbError } = await auth.supabase.from('vendors').insert([{ 
      company_id: auth.companyId, 
      name: parsed.name,
      account_name: parsed.account_name,
      account_number: parsed.account_number,
      bank_name: parsed.bank_name,
      swift_bic: parsed.swift_bic,
      country: parsed.country,
      email: parsed.email,
      created_by: auth.userId,
      verification_status: 'verified' // Direct creation assumes trusted input for MVP, change requests handle updates.
    }]).select().single();

    if (dbError) throw dbError;

    await auth.supabase.from('audit_logs').insert([{
      company_id: auth.companyId, wire_id: '00000000-0000-0000-0000-000000000000', actor_id: auth.userId, action: 'VENDOR_CREATED', new_hash: 'SYSTEM'
    }]);

    return NextResponse.json({ success: true, data: newVendor });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
