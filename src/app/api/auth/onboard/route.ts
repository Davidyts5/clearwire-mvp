export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/api-auth';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const OnboardSchema = z.object({
  companyName: z.string().min(2, "Company Name must be at least 2 characters").max(100),
  fullName: z.string().min(2, "Full Name is required").max(100),
  email: z.string().email("Invalid email address"),
  password: z.string().min(12, "Password must be at least 12 characters for enterprise security")
});

export async function POST(req: Request) {
  let authUserId: string | null = null;
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
      return NextResponse.json({ error: "Failed to create secure credentials." }, { status: 500 });
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

    // 3. Determine if email confirmation is required by checking the session
    // If the user is returned but the session is null, Supabase requires email verification.
    const requiresEmailVerification = authData.session === null;

    return NextResponse.json({ 
      success: true, 
      requiresEmailVerification,
      workspace: rpcData 
    });

  } catch (error: any) {
    // FATAL ERROR ROLLBACK
    // If the database transaction failed, we must destroy the orphaned Auth record immediately.
    if (authUserId) {
      console.error(`[FATAL] Provisioning failed. Rolling back user: ${authUserId}`);
      await adminClient.auth.admin.deleteUser(authUserId).catch(e => console.error("Rollback failed:", e));
    }

    return NextResponse.json({ 
      error: error.errors ? error.errors[0].message : (error.message || 'An unexpected error occurred during onboarding.') 
    }, { status: 400 });
  }
}
