import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth, verifyTenantResource } from '@/lib/api-auth';

const UpdateLimitSchema = z.object({
  approval_limit: z.number().min(0, "Limit cannot be negative")
});

export const PUT = withAuth(['cfo'], async (req, { params }, auth) => {
  try {
    const body = await req.json();
    const parsed = UpdateLimitSchema.parse(body);

    // Defense-in-depth: Ensure the user the CFO is trying to edit actually belongs to their company
    await verifyTenantResource(auth.supabase, 'users', params.id, auth.companyId);

    const { data, error } = await auth.supabase
      .from('users')
      .update({ approval_limit: parsed.approval_limit })
      .eq('id', params.id)
      .eq('company_id', auth.companyId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update limit' }, { status: 500 });
  }
});
