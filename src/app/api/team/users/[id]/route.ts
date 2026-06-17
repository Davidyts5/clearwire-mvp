import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth, verifyTenantResource, getAdminClient } from '@/lib/api-auth';
import { ROLES } from '@/lib/roles';

const UpdateLimitSchema = z.object({
  approval_limit: z.number().min(0, "Limit cannot be negative")
});

export const PUT = withAuth([ROLES.CFO], async (req, { params }, auth) => {
  try {
    const body = await req.json();
    const parsed = UpdateLimitSchema.parse(body);

    // 1. We must use the Admin client because the target user's row is strictly isolated by RLS.
    // The CFO is authorized to edit it (we proved they are a CFO via withAuth),
    // but the strict RLS policy says "users can only read/write their OWN profile".
    const adminClient = await getAdminClient();

    // 2. Defense-in-depth: Ensure the user the CFO is trying to edit actually belongs to their company.
    // Using the admin client to verify this safely.
    await verifyTenantResource(adminClient, 'users', params.id, auth.companyId);

    // 3. Perform the update securely bypassing the "own profile only" RLS constraint
    const { data, error } = await adminClient
      .from('users')
      .update({ approval_limit: parsed.approval_limit })
      .eq('id', params.id)
      .eq('company_id', auth.companyId)
      .select()
      .single();

    if (error) throw error;
    
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Limit Update Error:", error);
    // Explicitly return structured JSON to prevent "Cannot coerce result to JSON" on the frontend
    return NextResponse.json({ success: false, error: error.message || 'Failed to update limit' }, { status: 500 });
  }
});
