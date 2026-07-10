export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { ROLE_VALUES } from '@/lib/roles';

export const GET = withAuth([...ROLE_VALUES], async (req, ctx, auth) => {
  try {
    const { data, error } = await auth.supabase
      .from('user_authenticators')
      .select('id, user_id, credential_id, credential_public_key as public_key, device_name, credential_device_type as device_type, created_at, last_used_at, revoked')
      .eq('user_id', auth.userId)
      .eq('revoked', false)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
