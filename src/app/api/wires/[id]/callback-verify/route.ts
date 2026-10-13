export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { withAuth, verifyTenantResource, getAdminClient } from '@/lib/api-auth';
import { ROLES } from '@/lib/roles';
import { appendAuditLog } from '@/lib/audit-chain';

export const POST = withAuth([ROLES.CONTROLLER, ROLES.CFO], async (req, { params }, auth) => {
  try {
    const { data: visibleWire, error: visibilityError } = await auth.supabase
      .from('wire_requests')
      .select('id')
      .eq('id', params.id)
      .eq('company_id', auth.companyId)
      .lte('visible_after', new Date().toISOString())
      .maybeSingle();
    if (visibilityError || !visibleWire) {
      return NextResponse.json({ error: 'Wire not found or access denied' }, { status: 404 });
    }

    await verifyTenantResource(auth.supabase, 'wire_requests', params.id, auth.companyId);

    const body = await req.json();
    const { phone_number_called, contact_name, notes } = body;

    if (!phone_number_called || !contact_name || !notes) {
      return NextResponse.json({ error: 'Missing required callback verification fields.' }, { status: 400 });
    }

    const { data: record, error } = await auth.supabase.from('vendor_callback_verifications').insert([{
      wire_id: params.id,
      company_id: auth.companyId,
      verified_by: auth.userId,
      phone_number_called,
      contact_name,
      notes
    }]).select().single();

    if (error) throw error;

    const adminClient = await getAdminClient();
    await appendAuditLog(adminClient, {
      companyId: auth.companyId,
      wireId: params.id,
      actorId: auth.userId,
      action: 'VENDOR_CALLBACK_VERIFIED',
      eventPayload: { phone_number_called, contact_name, notes }
    });

    return NextResponse.json({ success: true, data: record });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
