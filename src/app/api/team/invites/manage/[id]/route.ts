export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { withAuth, getAdminClient } from '@/lib/api-auth';
import { ROLES } from '@/lib/roles';
import { appendAuditLog } from '@/lib/audit-chain';

// DELETE to Cancel
export const DELETE = withAuth([ROLES.CFO], async (req, { params }, auth) => {
  try {
    const adminClient = await getAdminClient();

    const { data: invite, error: fetchError } = await auth.supabase
      .from('team_invites')
      .select('id, status, email')
      .eq('id', params.id)
      .eq('company_id', auth.companyId)
      .single();

    if (fetchError || !invite) return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    if (invite.status !== 'pending') return NextResponse.json({ error: `Cannot cancel a ${invite.status} invite.` }, { status: 400 });

    const { error: updateError } = await auth.supabase
      .from('team_invites')
      .update({ status: 'cancelled' })
      .eq('id', params.id);

    if (updateError) throw updateError;

    await appendAuditLog(adminClient, {
      companyId: auth.companyId,
      wireId: '00000000-0000-0000-0000-000000000000',
      actorId: auth.userId,
      action: 'INVITATION_CANCELLED',
      eventPayload: { invite_id: params.id, email: invite.email }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

// PUT to Resend (Generates new token)
export const PUT = withAuth([ROLES.CFO], async (req, { params }, auth) => {
  try {
    const adminClient = await getAdminClient();

    const { data: invite, error: fetchError } = await auth.supabase
      .from('team_invites')
      .select('id, status, email')
      .eq('id', params.id)
      .eq('company_id', auth.companyId)
      .single();

    if (fetchError || !invite) return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    if (invite.status === 'accepted') return NextResponse.json({ error: `User has already accepted this invite.` }, { status: 400 });

    const newToken = crypto.randomBytes(32).toString('hex');
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { error: updateError } = await auth.supabase
      .from('team_invites')
      .update({ 
        token: newToken,
        expires_at: newExpiresAt,
        status: 'pending' // Reactivates expired or cancelled invites
      })
      .eq('id', params.id);

    if (updateError) throw updateError;

    await appendAuditLog(adminClient, {
      companyId: auth.companyId,
      wireId: '00000000-0000-0000-0000-000000000000',
      actorId: auth.userId,
      action: 'INVITATION_RESENT',
      eventPayload: { invite_id: params.id, email: invite.email }
    });

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const magicLink = `${siteUrl}/invite/${newToken}`;

    return NextResponse.json({ success: true, magicLink });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
