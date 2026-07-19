export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth, getAdminClient } from '@/lib/api-auth';
import { ROLE_VALUES } from '@/lib/roles';

const PrefsSchema = z.object({
  email_notifications_enabled: z.boolean(),
});

export const PATCH = withAuth([...ROLE_VALUES], async (req, ctx, auth) => {
  try {
    const body = await req.json();
    const parsed = PrefsSchema.parse(body);
    const adminClient = await getAdminClient();
    const { error } = await adminClient
      .from('users')
      .update({ email_notifications_enabled: parsed.email_notifications_enabled })
      .eq('id', auth.userId);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update preferences' }, { status: 400 });
  }
});
