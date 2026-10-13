import { NextResponse } from 'next/server';
import { withAuth, verifyTenantResource, getAdminClient } from '@/lib/api-auth';
import { ROLES } from '@/lib/roles';
import { appendAuditLog } from '@/lib/audit-chain';

export const POST = withAuth([ROLES.CONTROLLER, ROLES.CFO], async (req, { params }, auth) => {
  try {
    await verifyTenantResource(auth.supabase, 'vendor_change_requests', params.id, auth.companyId);

    const { action, rejection_notes } = await req.json();

    if (action === 'decline') {
      const { data, error } = await auth.supabase
        .from('vendor_change_requests')
        .update({ status: 'rejected', reviewed_by: auth.userId, rejection_notes, updated_at: new Date().toISOString() })
        .eq('id', params.id)
        .select()
        .single();
      
      if (error) throw error;

      const adminClient = await getAdminClient();
      await appendAuditLog(adminClient, {
        companyId: auth.companyId,
        wireId: null,
        actorId: auth.userId,
        action: 'VENDOR_CHANGE_REJECTED',
        eventPayload: {
          type: 'VENDOR_CHANGE_REJECTED',
          vendor_change_request_id: params.id,
          rejection_notes: rejection_notes || null,
        },
      });

      return NextResponse.json({ success: true, data });
    }

    if (action === 'approve') {
      const adminClient = await getAdminClient();
      const { data, error } = await adminClient.rpc('approve_vendor_change', {
        p_request_id: params.id,
        p_actor_id: auth.userId
      });

      if (error) throw new Error(error.message);
      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
});
