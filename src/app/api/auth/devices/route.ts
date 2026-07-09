import { NextResponse } from 'next/server';
import { withAuth, getAdminClient } from '@/lib/api-auth';
import { ROLE_VALUES, ROLES } from '@/lib/roles';

// GET all devices for a user (or all company devices if CFO)
export const GET = withAuth([...ROLE_VALUES], async (req, ctx, auth) => {
  try {
    const url = new URL(req.url);
    const targetUserId = url.searchParams.get('userId');

    let query = auth.supabase.from('user_authenticators').select('id, name, created_at, last_used_at, transports, user_id, users!inner(full_name, email, role, company_id)');
    
    if (auth.role === ROLES.CFO) {
      // CFO can view devices for the whole company, or a specific user in their company
      query = query.eq('users.company_id', auth.companyId);
      if (targetUserId) {
        query = query.eq('user_id', targetUserId);
      }
    } else {
      // Normal users can only see their own devices
      query = query.eq('user_id', auth.userId);
    }

    const { data, error } = await query.order('last_used_at', { ascending: false });
    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
