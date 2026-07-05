import { NextResponse } from 'next/server';
import { withAuth, getAdminClient } from '@/lib/api-auth';
import { ROLES } from '@/lib/roles';
import { z } from 'zod';

const ReviewSchema = z.object({
  action: z.enum(['approve', 'reject', 'escalate']),
  reason: z.string().optional(),
  restrict_vendor: z.boolean().optional()
});

export const POST = withAuth([ROLES.CONTROLLER, ROLES.CFO], async (req, { params }, auth) => {
  try {
    const body = await req.json();
    const parsed = ReviewSchema.parse(body);

    if (parsed.action === 'reject' && (!parsed.reason || parsed.reason.trim() === '')) {
      return NextResponse.json({ error: 'Rejection reason is required.' }, { status: 400 });
    }

    const supabaseAdmin = await getAdminClient();

    const { data: request, error: reqError } = await supabaseAdmin
      .from('vendor_change_requests')
      .select('*')
      .eq('id', params.reqId)
      .eq('company_id', auth.companyId)
      .single();

    if (reqError || !request) return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    if (request.status !== 'pending' && request.status !== 'awaiting_cfo') {
      return NextResponse.json({ error: `Request already processed: ${request.status}` }, { status: 400 });
    }

    if (request.status === 'awaiting_cfo' && auth.role !== ROLES.CFO) {
      return NextResponse.json({ error: 'Only CFO can review escalated requests.' }, { status: 403 });
    }
    if (parsed.action === 'escalate' && auth.role !== ROLES.CONTROLLER) {
      return NextResponse.json({ error: 'Only Controllers can escalate to CFO.' }, { status: 403 });
    }

    let newReqStatus = '';
    let vendorUpdates = null;
    let historyAction = '';

    if (parsed.action === 'approve') {
      newReqStatus = 'approved';
      vendorUpdates = request.new_data;
      historyAction = auth.role === ROLES.CFO ? 'CFO_APPROVED' : 'CONTROLLER_APPROVED';
    } else if (parsed.action === 'reject') {
      newReqStatus = (parsed.restrict_vendor && auth.role === ROLES.CFO) ? 'rejected_flagged' : 'rejected';
      historyAction = auth.role === ROLES.CFO ? 'CFO_REJECTED' : 'CONTROLLER_REJECTED';
    } else if (parsed.action === 'escalate') {
      newReqStatus = 'awaiting_cfo';
      historyAction = 'ESCALATED_TO_CFO';
    }

    const { error: updReqError } = await supabaseAdmin
      .from('vendor_change_requests')
      .update({
        status: newReqStatus,
        reviewed_by: auth.userId,
        rejection_reason: parsed.reason || null,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', request.id);

    if (updReqError) throw updReqError;

    if (vendorUpdates) {
      const { error: updVenError } = await supabaseAdmin
        .from('vendors')
        .update(vendorUpdates)
        .eq('id', request.vendor_id);
      if (updVenError) throw updVenError;
    } else if (parsed.action === 'reject' && parsed.restrict_vendor && auth.role === ROLES.CFO) {
      const { error: updVenError } = await supabaseAdmin
        .from('vendors')
        .update({ status: 'restricted' })
        .eq('id', request.vendor_id);
      if (updVenError) throw updVenError;
    }

    await supabaseAdmin.from('vendor_history').insert([{
      company_id: auth.companyId,
      vendor_id: request.vendor_id,
      actor_id: auth.userId,
      action: historyAction,
      details: { reason: parsed.reason, request_id: request.id }
    }]);

    await auth.supabase.from('audit_logs').insert([{
      company_id: auth.companyId, wire_id: '00000000-0000-0000-0000-000000000000', actor_id: auth.userId, action: `VENDOR_CHANGE_${historyAction}`, new_hash: 'SYSTEM'
    }]);

    if (parsed.action === 'reject' && parsed.restrict_vendor && auth.role === ROLES.CFO) {
      await supabaseAdmin.from('vendor_history').insert([{
        company_id: auth.companyId,
        vendor_id: request.vendor_id,
        actor_id: auth.userId,
        action: 'VENDOR_RESTRICTED',
        details: { reason: parsed.reason, request_id: request.id }
      }]);

      await auth.supabase.from('audit_logs').insert([{
        company_id: auth.companyId, wire_id: '00000000-0000-0000-0000-000000000000', actor_id: auth.userId, action: 'VENDOR_RESTRICTED', new_hash: 'SYSTEM'
      }]);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
