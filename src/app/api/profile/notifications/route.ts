export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth, getAdminClient } from '@/lib/api-auth';
import { ROLE_VALUES } from '@/lib/roles';
import { appendAuditLog } from '@/lib/audit-chain';

const PrefsSchema = z.object({
  email_notifications_enabled: z.boolean(),
});

export const PATCH = withAuth([...ROLE_VALUES], async (req, ctx, auth) => {
  try {
    const body = await req.json();
    const parsed = PrefsSchema.parse(body);
    const adminClient = await getAdminClient();
    const { data: previous, error: readError } = await adminClient
      .from('users')
      .select('email_notifications_enabled')
      .eq('id', auth.userId)
      .eq('company_id', auth.companyId)
      .single();
    if (readError) throw readError;

    const { error } = await adminClient
      .from('users')
      .update({ email_notifications_enabled: parsed.email_notifications_enabled })
      .eq('id', auth.userId)
      .eq('company_id', auth.companyId);
    if (error) throw error;

    if (previous.email_notifications_enabled !== parsed.email_notifications_enabled) {
      await appendAuditLog(adminClient, {
        companyId: auth.companyId,
        wireId: null,
        actorId: auth.userId,
        action: 'USER_EMAIL_NOTIFICATION_PREFERENCE_CHANGED',
        eventPayload: {
          previous_enabled: previous.email_notifications_enabled,
          new_enabled: parsed.email_notifications_enabled,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update preferences' }, { status: 400 });
  }
});
