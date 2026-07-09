export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { ROLE_VALUES, ROLES } from '@/lib/roles';

// GET all devices for a user (or all company devices if CFO)
export const GET = withAuth([...ROLE_VALUES], async (req, ctx, auth) => {
  try {
    const url = new URL(req.url);
    const targetUserId = url.searchParams.get('userId');

    // We will drop the users join to prevent RLS schema errors, 
    // and manually map if CFO requests it, or just return straight devices for simple viewing
    let query = auth.supabase.from('user_authenticators').select('id, name, created_at, last_used_at, transports, user_id');
    
    if (auth.role === ROLES.CFO && targetUserId) {
      query = query.eq('user_id', targetUserId);
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
