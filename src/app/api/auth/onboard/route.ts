export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/api-auth';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { appendAuditLog } from '@/lib/audit-chain';
import { TERMS_VERSION, PRIVACY_NOTICE_VERSION } from '@/lib/legal';

const OnboardSchema = z.object({
  companyName: z.string().min(2, "Company Name must be at least 2 characters").max(100),
  fullName: z.string().min(2, "Full Name is required").max(100),
  email: z.string().email("Invalid email address"),
  password: z.string().min(12, "Password must be at least 12 characters"),
  termsAccepted: z.boolean().refine(value => value, { message: 'Agree to the Terms of Use and acknowledge the Privacy Notice to continue.' })
});

export async function POST(req: Request) {
  let authUserId: string | null = null;
  let provisionedCompanyId: string | null = null;
  const adminClient = await getAdminClient();

  try {
    const body = await req.json();
    const parsed = OnboardSchema.parse(body);

    const supabase = createClient();

    // 1. Create the Auth User
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: parsed.email,
      password: parsed.password,
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    if (!authData.user) {
      return NextResponse.json({ error: "Failed to create credentials." }, { status: 500 });
    }

    authUserId = authData.user.id;

    // 2. Execute Atomic Provisioning RPC
    const { data: rpcData, error: rpcError } = await adminClient.rpc('onboard_new_tenant', {
      p_auth_id: authUserId,
      p_email: parsed.email,
      p_full_name: parsed.fullName,
      p_company_name: parsed.companyName
    });

    if (rpcError) {
      throw new Error(rpcError.message);
    }

    provisionedCompanyId = rpcData?.company_id || null;
    if (!provisionedCompanyId || !authUserId) throw new Error('Tenant provisioning returned incomplete identity data.');

    await appendAuditLog(adminClient, {
      companyId: provisionedCompanyId,
      wireId: null,
      actorId: authUserId,
      action: 'TENANT_WORKSPACE_CREATED',
      eventPayload: {
        company_name: parsed.companyName,
        company_slug: rpcData.slug,
        legal_acceptance: {
          terms_version: TERMS_VERSION,
          privacy_notice_version: PRIVACY_NOTICE_VERSION,
          accepted_at: new Date().toISOString(),
        },
      },
    });

    // 3. Determine if email confirmation is required by checking the session
    // If the user is returned but the session is null, Supabase requires email verification.
    const requiresEmailVerification = authData.session === null;

    return NextResponse.json({ 
      success: true, 
      requiresEmailVerification,
      workspace: rpcData 
    });

  } catch (error: any) {
    // Only remove the newly created Auth identity if tenant provisioning never completed.
    // Once a workspace exists, keep its owner identity intact even if audit append fails.
    if (authUserId && !provisionedCompanyId) {
      console.error(`[FATAL] Provisioning failed. Rolling back user: ${authUserId}`);
      await adminClient.auth.admin.deleteUser(authUserId).catch(e => console.error('Rollback failed:', e));
    } else if (provisionedCompanyId) {
      console.error(`[FATAL] Workspace ${provisionedCompanyId} was created but its audit event could not be confirmed.`);
    }

    return NextResponse.json({
      error: provisionedCompanyId
        ? 'Workspace setup completed, but audit logging failed. Contact your workspace administrator before retrying.'
        : (error.errors ? error.errors[0].message : (error.message || 'An unexpected error occurred during onboarding.')),
    }, { status: provisionedCompanyId ? 500 : 400 });
  }
}
