import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth, getAdminClient, verifyTenantResource } from '@/lib/api-auth';
import { ROLES } from '@/lib/roles';

const UpdateLimitSchema = z.object({
  approval_limit: z.number().min(0, "Limit cannot be negative"),
  can_unfreeze: z.boolean().optional().default(false)
});

export const PUT = withAuth([ROLES.CFO], async (req, { params }, auth) => {
  try {
    const body = await req.json();
    const parsed = UpdateLimitSchema.parse(body);

    const adminClient = await getAdminClient();
    await verifyTenantResource(adminClient, 'users', params.id, auth.companyId);

    const { data, error } = await adminClient
      .from('users')
      .update({ 
        approval_limit: parsed.approval_limit,
        can_unfreeze: parsed.can_unfreeze 
      })
      .eq('id', params.id)
      .eq('company_id', auth.companyId)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) throw new Error("Update failed or user not found");

    return NextResponse.json({ success: true, data: data[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update limit' }, { status: 500 });
  }
});
