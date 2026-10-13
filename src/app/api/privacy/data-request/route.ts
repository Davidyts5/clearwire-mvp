export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth, getAdminClient } from '@/lib/api-auth';
import { ROLE_VALUES } from '@/lib/roles';
import { appendAuditLog } from '@/lib/audit-chain';
import { PRIVACY_NOTICE_VERSION } from '@/lib/legal';

const DataRequestSchema = z.object({
  requestType: z.literal('deletion'),
  confirmed: z.literal(true),
}).strict();

export const POST = withAuth([...ROLE_VALUES], async (req, _context, auth) => {
  try {
    const parsed = DataRequestSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Confirm the account-deletion review request to continue.' }, { status: 400 });
    }

    const adminClient = await getAdminClient();
    await appendAuditLog(adminClient, {
      companyId: auth.companyId,
      wireId: null,
      actorId: auth.userId,
      action: 'PRIVACY_DELETION_REQUESTED',
      eventPayload: {
        request_type: parsed.data.requestType,
        privacy_notice_version: PRIVACY_NOTICE_VERSION,
        requested_at: new Date().toISOString(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to record privacy data request:', error);
    return NextResponse.json({ error: 'The request could not be recorded. Contact your workspace administrator.' }, { status: 500 });
  }
});
