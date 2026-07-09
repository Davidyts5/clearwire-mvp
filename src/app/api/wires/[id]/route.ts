export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { withAuth, verifyTenantResource, verifySegregationOfDuties, getAdminClient } from '@/lib/api-auth';
import { ROLES, ROLE_VALUES } from '@/lib/roles';

export const GET = withAuth([...ROLE_VALUES], async (req, { params }, auth) => {
  try {
    await verifyTenantResource(auth.supabase, 'wire_requests', params.id, auth.companyId);

    let query = auth.supabase.from('wire_requests').select('*').eq('id', params.id);
    if (auth.role === ROLES.CLERK) query = query.eq('clerk_id', auth.userId);
    
    const { data, error } = await query.single();
    if (error || !data) return NextResponse.json({ error: 'Wire not found or access denied' }, { status: 404 });
    
    const headers = new Headers();
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

    const isCFO = auth.role === ROLES.CFO;
    let isControllerAuthorized = false;

    if (auth.role === ROLES.CONTROLLER) {
      const { data: userData } = await auth.supabase.from('users').select('approval_limit, can_unfreeze').eq('id', auth.userId).single();
      const controllerLimit = userData?.approval_limit || 0;
      const canUnfreeze = userData?.can_unfreeze || false;
      
      const withinDollarLimit = data.amount <= controllerLimit;
      const allowedByRiskStatus = data.status !== 'frozen' || canUnfreeze;
      const allowedByMultiSig = data.status === 'pending' || data.status === 'pending_second_approval' || data.status === 'frozen';
      
      isControllerAuthorized = withinDollarLimit && allowedByRiskStatus && allowedByMultiSig;
    }

    const canApprove = isCFO || isControllerAuthorized;

    return NextResponse.json({ success: true, data, canApprove }, { status: 200, headers });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 404 });
  }
});

export const POST = withAuth([ROLES.CONTROLLER, ROLES.CFO], async (req, { params }, auth) => {
  try {
    await verifyTenantResource(auth.supabase, 'wire_requests', params.id, auth.companyId);
    await verifySegregationOfDuties(auth.supabase, params.id, auth.userId);

    const { data: wireData } = await auth.supabase.from('wire_requests').select('amount, status').eq('id', params.id).single();
    
    if (auth.role === ROLES.CONTROLLER) {
      const { data: userData } = await auth.supabase.from('users').select('approval_limit, can_unfreeze').eq('id', auth.userId).single();
      if (wireData.amount > (userData?.approval_limit || 0)) {
        return NextResponse.json({ error: `Unauthorized: Amount exceeds limits` }, { status: 403 });
      }
      if (wireData.status === 'frozen' && !userData?.can_unfreeze) {
        return NextResponse.json({ error: `Unauthorized: You do not have privilege to unfreeze high-risk transactions` }, { status: 403 });
      }
    }

    const { action, rejection_reason, rejection_notes } = await req.json();

    let newStatus = '';
    if (action === 'decline') newStatus = 'denied';
    else if (action === 'review') newStatus = 'under_review';
    else return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    const adminClient = await getAdminClient();
    const { data: updatedWire, error: rpcError } = await adminClient.rpc('transition_wire_state', {
      p_wire_id: params.id, 
      p_new_status: newStatus, 
      p_actor_id: auth.userId,
      p_crypto_hash: 'SYSTEM_GENERATED',
      p_rejection_reason: rejection_reason || null,
      p_rejection_notes: rejection_notes || null
    });

    if (rpcError) throw new Error(rpcError.message);
    return NextResponse.json({ success: true, data: updatedWire });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
});
