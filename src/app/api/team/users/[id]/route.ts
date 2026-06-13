import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth, verifyTenantResource } from '@/lib/api-auth';
import { ROLES } from '@/lib/roles';

const UpdateLimitSchema = z.object({
  approval_limit: z.number().min(0, "Limit cannot be negative")
});

export const PUT = withAuth([ROLES.CFO], async (req, { params }, auth) => {
  try {
    const body = await req.json();
    const parsed = UpdateLimitSchema.parse(body);

    await verifyTenantResource(auth.supabase, 'users', params.id, auth.companyId);

    const { data, error } = await auth.supabase
      .from('users')
      .update({ approval_limit: parsed.approval_limit })
      .eq('id', params.id)
      .eq('company_id', auth.companyId)
      .select(); // REMOVED .single() WHICH CAUSES THE JSON COERCION ERROR

    if (error) throw error;
    
    // Check if the array actually contains the updated user
    if (!data || data.length === 0) {
      throw new Error("Update failed or user not found");
    }

    return NextResponse.json({ success: true, data: data[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update limit' }, { status: 500 });
  }
});
