export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { ROLE_VALUES } from '@/lib/roles';

export const GET = withAuth([...ROLE_VALUES], async (req, ctx, auth) => {
  try {
    const url = new URL(req.url);
    const unreadOnly = url.searchParams.get('unreadOnly') === 'true';

    let query = auth.supabase.from('notifications').select('*').eq('user_id', auth.userId).order('created_at', { ascending: false }).limit(50);
    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data: notifications, error } = await query;
    if (error) throw error;

    const { count: unreadCount, error: countError } = await auth.supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', auth.userId)
      .eq('is_read', false);
      
    if (countError) throw countError;

    return NextResponse.json({ success: true, data: { notifications, unreadCount: unreadCount || 0 } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
