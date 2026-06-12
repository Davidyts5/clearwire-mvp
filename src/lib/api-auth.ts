import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Role } from '@/lib/roles';

export type AuthContext = {
  userId: string;
  companyId: string;
  role: Role;
  supabase: any; 
};

/**
 * Centralized API Authentication & Authorization Wrapper
 * Enforces SSR Session Validity, Tenant Linking, and Scoped RBAC.
 */
export function withAuth(
  allowedRoles: Role[],
  handler: (req: Request, context: any, auth: AuthContext) => Promise<NextResponse> | NextResponse
) {
  return async (req: Request, context: any) => {
    try {
      const supabase = createClient();
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized: Invalid or missing session' }, { status: 401 });
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('company_id, role')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.company_id) {
        return NextResponse.json({ error: 'Forbidden: User is not linked to a valid tenant organization' }, { status: 403 });
      }

      const userRole = userData.role as Role;

      if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
        return NextResponse.json({ error: `Forbidden: Endpoint requires roles [${allowedRoles.join(', ')}]. You are a [${userRole}].` }, { status: 403 });
      }

      const authContext: AuthContext = {
        userId: user.id,
        companyId: userData.company_id,
        role: userRole,
        supabase,
      };

      return await handler(req, context, authContext);
    } catch (error: any) {
      console.error('API Auth/Execution Error:', error);
      return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
  };
}

/**
 * Defense-in-Depth Tenant Resource Check.
 */
export async function verifyTenantResource(supabase: any, table: string, id: string, companyId: string) {
  const { data, error } = await supabase.from(table).select('company_id').eq('id', id).single();
  
  if (error || !data) {
    throw new Error(`Resource ${id} not found in ${table}`);
  }
  
  if (data.company_id !== companyId) {
    throw new Error(`CRITICAL: Tenant isolation violation. Resource belongs to ${data.company_id}, not ${companyId}`);
  }
  
  return true;
}
