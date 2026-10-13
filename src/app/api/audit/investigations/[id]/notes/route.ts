export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { withAuth, verifyTenantResource } from '@/lib/api-auth';
import { ROLES } from '@/lib/roles';

export const POST = withAuth([ROLES.AUDITOR, ROLES.CFO], async (req, { params }, auth) => {
  try {
    const { data: investigationRef, error: investigationRefError } = await auth.supabase
      .from('investigations')
      .select('id, wire_id')
      .eq('id', params.id)
      .eq('company_id', auth.companyId)
      .maybeSingle();
    if (investigationRefError || !investigationRef) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }
    if (auth.role === ROLES.CFO && investigationRef.wire_id) {
      const { data: visibleWire, error: visibilityError } = await auth.supabase
        .from('wire_requests')
        .select('id')
        .eq('id', investigationRef.wire_id)
        .eq('company_id', auth.companyId)
        .lte('visible_after', new Date().toISOString())
        .maybeSingle();
      if (visibilityError || !visibleWire) {
        return NextResponse.json({ error: 'Case not found' }, { status: 404 });
      }
    }

    await verifyTenantResource(auth.supabase, 'investigations', params.id, auth.companyId);
    const { note } = await req.json();
    
    if (!note || note.trim() === '') return NextResponse.json({ error: 'Note is required' }, { status: 400 });

    const { error } = await auth.supabase.from('investigation_notes').insert([{
      company_id: auth.companyId,
      investigation_id: params.id,
      author_id: auth.userId,
      note: note
    }]);

    if (error) throw error;
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
