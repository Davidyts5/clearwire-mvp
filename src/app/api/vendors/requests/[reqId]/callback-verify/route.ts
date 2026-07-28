export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { withAuth, verifyTenantResource } from '@/lib/api-auth';
import { ROLES } from '@/lib/roles';
import { appendAuditLog } from '@/lib/audit-chain';

export const POST = withAuth([ROLES.CONTROLLER, ROLES.CFO], async (req, { params }, auth) => {
  try {
    await verifyTenantResource(auth.supabase, 'vendor_change_requests', params.reqId, auth.companyId);

    const body = await req.json();
    const { phone_number_called, contact_name, notes } = body;

    if (!phone_number_called || !contact_name || !notes) {
      return NextResponse.json({ error: 'Missing required callback verification fields.' }, { status: 400 });
    }

    const { data: record, error } = await auth.supabase.from('vendor_callback_verifications').insert([{
      change_request_id: params.reqId,
      company_id: auth.companyId,
      verified_by: auth.userId,
      phone_number_called,
      contact_name,
      notes
    }]).select().single();

    if (error) throw error;

    await appendAuditLog(auth.supabase, {
      companyId: auth.companyId,
      wireId: null,
      actorId: auth.userId,
      action: 'VENDOR_CALLBACK_VERIFIED',
      eventPayload: { phone_number_called, contact_name, notes, change_request_id: params.reqId }
    });

    return NextResponse.json({ success: true, data: record });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
