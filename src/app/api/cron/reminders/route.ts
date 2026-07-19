export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/api-auth';
import { createNotification, NOTIFICATION_TYPES } from '@/lib/notifications';
import { ROLES } from '@/lib/roles';

const REMINDER_THRESHOLD_HOURS = 4;
const ESCALATION_THRESHOLD_HOURS = 24;

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminClient = await getAdminClient();
  const now = Date.now();

  const { data: pendingWires, error } = await adminClient
    .from('wire_requests')
    .select('*')
    .in('status', ['pending', 'pending_cfo', 'pending_second_approval']);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let reminders = 0, escalations = 0;

  for (const wire of pendingWires || []) {
    const ageHours = (now - new Date(wire.created_at).getTime()) / (1000 * 60 * 60);
    const lastReminderHoursAgo = wire.last_reminder_sent_at
      ? (now - new Date(wire.last_reminder_sent_at).getTime()) / (1000 * 60 * 60)
      : Infinity;

    if (ageHours >= ESCALATION_THRESHOLD_HOURS && !wire.escalated_at) {
      const { data: cfoUsers } = await adminClient.from('users').select('id').eq('company_id', wire.company_id).eq('role', ROLES.CFO);
      for (const cfo of cfoUsers || []) {
        await createNotification(adminClient, {
          companyId: wire.company_id,
          userId: cfo.id,
          type: NOTIFICATION_TYPES.WIRE_ESCALATED,
          title: 'Wire Escalated — Overdue Approval',
          message: `A wire for ${wire.vendor_name_snapshot} ($${wire.amount}) has been pending for over ${ESCALATION_THRESHOLD_HOURS} hours.`,
          actionUrl: `/approve/${wire.id}`,
          metadata: { wireAmount: wire.amount, vendorName: wire.vendor_name_snapshot },
          relatedWireId: wire.id,
        });
      }
      await adminClient.from('wire_requests').update({ escalated_at: new Date().toISOString() }).eq('id', wire.id);
      escalations++;
      continue;
    }

    if (ageHours >= REMINDER_THRESHOLD_HOURS && lastReminderHoursAgo >= REMINDER_THRESHOLD_HOURS) {
      let targets: string[] = [];
      if (wire.status === 'pending_cfo') {
        const { data: cfoUsers } = await adminClient.from('users').select('id').eq('company_id', wire.company_id).eq('role', ROLES.CFO);
        targets = (cfoUsers || []).map((u: any) => u.id);
      } else {
        const { data: controllers } = await adminClient.from('users').select('id').eq('company_id', wire.company_id).eq('role', ROLES.CONTROLLER);
        targets = (controllers || []).map((u: any) => u.id);
      }
      for (const userId of targets) {
        await createNotification(adminClient, {
          companyId: wire.company_id,
          userId,
          type: NOTIFICATION_TYPES.WIRE_REMINDER,
          title: 'Reminder: Wire Awaiting Your Approval',
          message: `A wire for ${wire.vendor_name_snapshot} ($${wire.amount}) is still awaiting approval.`,
          actionUrl: `/approve/${wire.id}`,
          metadata: { wireAmount: wire.amount, vendorName: wire.vendor_name_snapshot },
          relatedWireId: wire.id,
        });
      }
      await adminClient.from('wire_requests').update({ last_reminder_sent_at: new Date().toISOString() }).eq('id', wire.id);
      reminders++;
    }
  }

  return NextResponse.json({ success: true, reminders, escalations });
}
