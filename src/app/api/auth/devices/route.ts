export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { ROLE_VALUES, ROLES } from '@/lib/roles';

export const GET = withAuth([...ROLE_VALUES], async (req, ctx, auth) => {
  try {
    const url = new URL(req.url);
    const targetUserId = url.searchParams.get('userId');

    let query = auth.supabase.from('user_authenticators')
      .select('id, user_id, credential_id, public_key:credential_public_key, device_name, browser, os, form_factor, registered_location, device_type:credential_device_type, created_at, last_used_at, revoked, revoked_at, revoked_by, revoker:users!user_authenticators_revoked_by_fkey(full_name)');
    
    if (auth.role === ROLES.CFO && targetUserId) {
      query = query.eq('user_id', targetUserId);
    } else {
      query = query.eq('user_id', auth.userId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) {
      // Fallback query if the foreign key relation fails due to schema issues
      const fbQuery = auth.supabase.from('user_authenticators')
        .select('id, user_id, credential_id, public_key:credential_public_key, device_name, browser, os, form_factor, registered_location, device_type:credential_device_type, created_at, last_used_at, revoked, revoked_at, revoked_by');
      if (auth.role === ROLES.CFO && targetUserId) fbQuery.eq('user_id', targetUserId);
      else fbQuery.eq('user_id', auth.userId);
      
      const { data: fbData, error: fbError } = await fbQuery.order('created_at', { ascending: false });
      if (fbError) throw fbError;
      return NextResponse.json({ success: true, data: fbData });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
