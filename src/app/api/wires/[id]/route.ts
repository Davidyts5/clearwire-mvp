import { NextResponse } from 'next/server';
import { withAuth, verifyTenantResource } from '@/lib/api-auth';

export const GET = withAuth(['clerk', 'controller', 'cfo', 'auditor'], async (req, { params }, auth) => {
  // Defense-in-depth: explicitly verify this wire belongs to this user's company
  await verifyTenantResource(auth.supabase, 'wire_requests', params.id, auth.companyId);

  const { data, error } = await auth.supabase
    .from('wire_requests')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error) return NextResponse.json({ error: 'Wire not found' }, { status: 404 });
  
  const headers = new Headers();
  headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  headers.set('Pragma', 'no-cache');
  headers.set('Expires', '0');

  return NextResponse.json(
    { success: true, data, isCFO: auth.role === 'cfo' },
    { status: 200, headers }
  );
});

export const POST = withAuth(['cfo'], async (req, { params }, auth) => {
  await verifyTenantResource(auth.supabase, 'wire_requests', params.id, auth.companyId);

  const { action } = await req.json();

  let newStatus = '';
  if (action === 'decline') newStatus = 'denied';
  else if (action === 'review') newStatus = 'under_review';
  else return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  const { data: updatedWire, error: rpcError } = await auth.supabase.rpc('transition_wire_state', {
    p_wire_id: params.id,
    p_new_status: newStatus,
    p_actor_id: auth.userId
  });

  if (rpcError) {
    return NextResponse.json({ error: rpcError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, data: updatedWire });
});
