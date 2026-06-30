import { NextResponse } from 'next/server';
import { withAuth, verifyTenantResource } from '@/lib/api-auth';
import { ROLE_VALUES } from '@/lib/roles';
import { z } from 'zod';

const UpdateVendorSchema = z.object({
  account_number: z.string().optional().or(z.literal('')),
  swift_bic: z.string().optional().or(z.literal('')),
  account_name: z.string().optional().or(z.literal('')),
  reason: z.string().min(1, "Reason is required for bank changes")
});

export const GET = withAuth([...ROLE_VALUES], async (req, { params }, auth) => {
  try {
    await verifyTenantResource(auth.supabase, 'vendors', params.id, auth.companyId);
    const { data, error } = await auth.supabase.from('vendors').select('*').eq('id', params.id).single();
    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
});

export const POST = withAuth(['clerk'], async (req, { params }, auth) => {
  try {
    const vendor = await verifyTenantResource(auth.supabase, 'vendors', params.id, auth.companyId);
    
    const body = await req.json();
    const parsed = UpdateVendorSchema.parse(body);

    const oldData = {
      account_number: vendor.account_number,
      swift_bic: vendor.swift_bic,
      account_name: vendor.account_name
    };

    const newData = {
      account_number: parsed.account_number,
      swift_bic: parsed.swift_bic,
      account_name: parsed.account_name
    };

    const { data: requestData, error } = await auth.supabase.from('vendor_change_requests').insert([{
      company_id: auth.companyId,
      vendor_id: params.id,
      requested_by: auth.userId,
      old_data: oldData,
      new_data: newData,
      reason: parsed.reason,
      status: 'pending'
    }]).select().single();

    if (error) throw error;

    await auth.supabase.from('audit_logs').insert([{
      company_id: auth.companyId, wire_id: '00000000-0000-0000-0000-000000000000', actor_id: auth.userId, action: 'VENDOR_CHANGE_REQUESTED', new_hash: 'SYSTEM'
    }]);

    return NextResponse.json({ success: true, data: requestData });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
