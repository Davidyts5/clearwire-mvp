export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { getAdminClient, withAuth } from '@/lib/api-auth';
import { ROLE_VALUES, ROLES } from '@/lib/roles';

export const GET = withAuth([...ROLE_VALUES], async (req, ctx, auth) => {
  try {
    const url = new URL(req.url);
    const targetUserId = url.searchParams.get('userId');
    let requestedUserId = auth.userId;
    let dataClient = auth.supabase;

    // CFOs may inspect devices for their own team, but never another tenant.
    if (auth.role === ROLES.CFO && targetUserId) {
      requestedUserId = targetUserId;

      if (targetUserId !== auth.userId) {
        const adminClient = await getAdminClient();
        const { data: targetUser, error: targetUserError } = await adminClient
          .from('users')
          .select('id')
          .eq('id', targetUserId)
          .eq('company_id', auth.companyId)
          .maybeSingle();

        if (targetUserError) throw targetUserError;
        if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        // The company membership was checked above; use the admin client only for this scoped lookup.
        dataClient = adminClient;
      }
    }

    const selectDeviceFields = 'id, user_id, device_name, browser, os, form_factor, registered_location, device_type:credential_device_type, created_at, last_used_at, revoked, revoked_at, revoked_by, revoker:users!user_authenticators_revoked_by_fkey(full_name)';
    const { data, error } = await dataClient
      .from('user_authenticators')
      .select(selectDeviceFields)
      .eq('user_id', requestedUserId)
      .order('created_at', { ascending: false });

    if (error) {
      // Fallback if the foreign-key relation is unavailable in the deployed schema.
      const { data: fallbackData, error: fallbackError } = await dataClient
        .from('user_authenticators')
        .select('id, user_id, device_name, browser, os, form_factor, registered_location, device_type:credential_device_type, created_at, last_used_at, revoked, revoked_at, revoked_by')
        .eq('user_id', requestedUserId)
        .order('created_at', { ascending: false });

      if (fallbackError) throw fallbackError;
      return NextResponse.json({ success: true, data: fallbackData });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
