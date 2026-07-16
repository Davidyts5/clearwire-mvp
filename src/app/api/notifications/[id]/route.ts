export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { ROLE_VALUES } from '@/lib/roles';

export const PATCH = withAuth([...ROLE_VALUES], async (req, { params }, auth) => {
  try {
    const { error } = await auth.supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', params.id)
      .eq('user_id', auth.userId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
