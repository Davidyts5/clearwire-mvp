export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { withAuth, verifyTenantResource } from '@/lib/api-auth';
import { ROLES } from '@/lib/roles';

export const POST = withAuth([ROLES.AUDITOR, ROLES.CFO], async (req, { params }, auth) => {
  try {
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
