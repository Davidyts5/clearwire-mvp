import { NextResponse } from 'next/server';
import { withAuth, verifyTenantResource } from '@/lib/api-auth';
import { ROLES } from '@/lib/roles';

export const GET = withAuth([ROLES.AUDITOR, ROLES.CFO], async (req, { params }, auth) => {
  try {
    await verifyTenantResource(auth.supabase, 'investigations', params.id, auth.companyId);
    
    const { data: inv, error } = await auth.supabase
      .from('investigations')
      .select('*, vendors(*), wire_requests(*), users!assigned_to(full_name), investigation_notes(*, users!author_id(full_name, role))')
      .eq('id', params.id)
      .single();

    if (error) throw error;

    // Order notes
    if (inv.investigation_notes) {
      inv.investigation_notes.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return NextResponse.json({ success: true, data: inv });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

export const PUT = withAuth([ROLES.AUDITOR, ROLES.CFO], async (req, { params }, auth) => {
  try {
    await verifyTenantResource(auth.supabase, 'investigations', params.id, auth.companyId);
    const body = await req.json();

    const payload: any = { updated_at: new Date().toISOString() };
    if (body.status) payload.status = body.status;
    if (body.status === 'resolved') {
      payload.resolved_at = new Date().toISOString();
      payload.resolution_notes = body.resolution_notes || 'Resolved by Auditor';
    }

    const { error } = await auth.supabase.from('investigations').update(payload).eq('id', params.id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
