import { NextResponse } from 'next/server';
import { withAuth, verifyTenantResource } from '@/lib/api-auth';

export const GET = withAuth(['clerk', 'controller', 'cfo', 'auditor'], async (req, { params }, auth) => {
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

  try {
    // FIX: Execute state transition directly instead of relying on the RPC function
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

    // Add audit log
    await auth.supabase.from('audit_logs').insert([{
      company_id: auth.companyId,
      wire_id: params.id,
      actor_id: auth.userId,
      action: `STATE_CHANGED_TO_${newStatus.toUpperCase()}`,
      new_hash: 'SYSTEM_GENERATED'
    }]);

    return NextResponse.json({ success: true, data: updatedWire });
  } catch (error: any) {
    console.error("State Transition Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
