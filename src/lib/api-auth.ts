import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export type AuthContext = {
  userId: string;
  companyId: string;
  role: string;
  supabase: any; // Authenticated SSR Supabase Client
};

/**
 * Centralized API Authentication & Authorization Wrapper
 * Enforces SSR Session Validity, Tenant Linking, and Scoped RBAC.
 */
export function withAuth(
  allowedRoles: string[],
  handler: (req: Request, context: any, auth: AuthContext) => Promise<NextResponse> | NextResponse
) {
  return async (req: Request, context: any) => {
    try {
      const supabase = createClient();
      
      // 1. Verify Session Validity (Cryptographically secure SSR check)
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized: Invalid or missing session' }, { status: 401 });
      }

      // 2. Tenant Verification & Role Extraction
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('company_id, role')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.company_id) {
        return NextResponse.json({ error: 'Forbidden: User is not linked to a valid tenant organization' }, { status: 403 });
      }

      // 3. Scoped RBAC Enforcement
      if (allowedRoles.length > 0 && !allowedRoles.includes(userData.role)) {
        return NextResponse.json({ error: `Forbidden: Endpoint requires roles [${allowedRoles.join(', ')}]. You are a [${userData.role}].` }, { status: 403 });
      }

      // Construct Auth Context for the handler
      const authContext: AuthContext = {
        userId: user.id,
        companyId: userData.company_id,
        role: userData.role,
        supabase,
      };

      // Execute the actual endpoint logic
      return await handler(req, context, authContext);
    } catch (error: any) {
      console.error('API Auth/Execution Error:', error);
      return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
  };
}

/**
 * Defense-in-Depth Tenant Resource Check.
 * Manually verifies that the requested resource belongs to the user's company,
 * providing a secondary safety net above Postgres RLS.
 */
export async function verifyTenantResource(supabase: any, table: string, id: string, companyId: string) {
  const { data, error } = await supabase.from(table).select('company_id').eq('id', id).single();
  
  if (error || !data) {
    throw new Error(`Resource ${id} not found in ${table}`);
  }
  
  if (data.company_id !== companyId) {
    throw new Error(`CRITICAL: Tenant isolation violation. Resource ${id} belongs to ${data.company_id}, not ${companyId}`);
  }
  
  return true;
}
