import { NextResponse } from 'next/server';
import { withAuth, verifyTenantResource } from '@/lib/api-auth';
import { ROLES, ROLE_VALUES, Permissions } from '@/lib/roles';

export const GET = withAuth([...ROLE_VALUES], async (req, { params }, auth) => {
  await verifyTenantResource(auth.supabase, 'wire_requests', params.id, auth.companyId);

  // STRICT CLERK REQUIREMENT: Clerks can only view their own wires
  let query = auth.supabase.from('wire_requests').select('*').eq('id', params.id);
  if (auth.role === ROLES.CLERK) {
    query = query.eq('clerk_id', auth.userId);
  }
  
  const { data, error } = await query.single();
  if (error || !data) return NextResponse.json({ error: 'Wire not found or access denied' }, { status: 404 });
  
  const headers = new Headers();
  headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  headers.set('Pragma', 'no-cache');
  headers.set('Expires', '0');

  // Verify Controller Limits dynamically
  const isCFO = auth.role === ROLES.CFO;
  let isControllerAuthorized = false;

  if (auth.role === ROLES.CONTROLLER) {
    const { data: userData } = await auth.supabase.from('users').select('approval_limit').eq('id', auth.userId).single();
    const controllerLimit = userData?.approval_limit || 0;
    isControllerAuthorized = data.amount <= controllerLimit;
  }

  const canApprove = isCFO || isControllerAuthorized;

  return NextResponse.json(
    { success: true, data, canApprove },
    { status: 200, headers }
  );
});

export const POST = withAuth([ROLES.CONTROLLER, ROLES.CFO], async (req, { params }, auth) => {
  const wire = await verifyTenantResource(auth.supabase, 'wire_requests', params.id, auth.companyId);

  const { data: wireData } = await auth.supabase.from('wire_requests').select('amount').eq('id', params.id).single();
  
  if (auth.role === ROLES.CONTROLLER) {
    const { data: userData } = await auth.supabase.from('users').select('approval_limit').eq('id', auth.userId).single();
    const controllerLimit = userData?.approval_limit || 0;
    if (wireData.amount > controllerLimit) {
      return NextResponse.json({ error: `Unauthorized: You are only authorized to approve wires up to $${Number(controllerLimit).toLocaleString()}` }, { status: 403 });
    }
  }

  const { action } = await req.json();

  let newStatus = '';
  if (action === 'decline') newStatus = 'denied';
  else if (action === 'review') newStatus = 'under_review';
  else return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  try {
    const { data: updatedWire, error: updateError } = await auth.supabase
      .from('wire_requests')
      .update({ 
        status: newStatus,
        cfo_id: auth.userId,
        approved_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single();

    if (updateError) throw updateError;

    await auth.supabase.from('audit_logs').insert([{
      company_id: auth.companyId,
      wire_id: params.id,
      actor_id: auth.userId,
      action: `STATE_CHANGED_TO_${newStatus.toUpperCase()}`,
      new_hash: 'SYSTEM_GENERATED'
    }]);

    return NextResponse.json({ success: true, data: updatedWire });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
