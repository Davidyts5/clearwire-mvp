export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { ROLES, ROLE_VALUES } from '@/lib/roles';

const NOTIFICATION_PAGE_SIZE = 1000;
const WIRE_ID_CHUNK_SIZE = 100;

async function filterApproverNotifications(supabase: any, companyId: string, notifications: any[]) {
  const relatedWireIds = [...new Set(
    notifications
      .map((notification) => notification.related_wire_id)
      .filter((wireId): wireId is string => typeof wireId === 'string' && wireId.length > 0),
  )];
  if (relatedWireIds.length === 0) return notifications;

  const visibleWireIds = new Set<string>();
  for (let offset = 0; offset < relatedWireIds.length; offset += WIRE_ID_CHUNK_SIZE) {
    const idChunk = relatedWireIds.slice(offset, offset + WIRE_ID_CHUNK_SIZE);
    const { data, error } = await supabase
      .from('wire_requests')
      .select('id')
      .eq('company_id', companyId)
      .in('id', idChunk)
      .lte('visible_after', new Date().toISOString());
    if (error) throw error;
    for (const wire of data || []) visibleWireIds.add(wire.id);
  }

  return notifications.filter((notification) =>
    !notification.related_wire_id || visibleWireIds.has(notification.related_wire_id)
  );
}

export const GET = withAuth([...ROLE_VALUES], async (req, ctx, auth) => {
  try {
    const url = new URL(req.url);
    const unreadOnly = url.searchParams.get('unreadOnly') === 'true';
    const isApprover = auth.role === ROLES.CFO || auth.role === ROLES.CONTROLLER;

    let query = auth.supabase.from('notifications').select('*').eq('user_id', auth.userId).order('created_at', { ascending: false }).limit(50);
    if (unreadOnly) query = query.eq('is_read', false);

    const { data: notificationRows, error } = await query;
    if (error) throw error;
    const notifications = isApprover
      ? await filterApproverNotifications(auth.supabase, auth.companyId, notificationRows || [])
      : notificationRows || [];

    let unreadCount = 0;
    if (isApprover) {
      // Count only unreleased-wire notifications, including older rows created before
      // immediate quarantine notifications were suppressed.
      let offset = 0;
      while (true) {
        const { data: unreadRows, error: countError } = await auth.supabase
          .from('notifications')
          .select('related_wire_id')
          .eq('user_id', auth.userId)
          .eq('is_read', false)
          .order('created_at', { ascending: false })
          .range(offset, offset + NOTIFICATION_PAGE_SIZE - 1);
        if (countError) throw countError;

        const visibleRows = await filterApproverNotifications(auth.supabase, auth.companyId, unreadRows || []);
        unreadCount += visibleRows.length;
        if (!unreadRows || unreadRows.length < NOTIFICATION_PAGE_SIZE) break;
        offset += NOTIFICATION_PAGE_SIZE;
      }
    } else {
      const { count, error: countError } = await auth.supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', auth.userId)
        .eq('is_read', false);

      if (countError) throw countError;
      unreadCount = count || 0;
    }

    return NextResponse.json({ success: true, data: { notifications, unreadCount } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 503 });
  }
});
