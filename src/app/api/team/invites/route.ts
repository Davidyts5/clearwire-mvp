export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { withAuth, getAdminClient } from '@/lib/api-auth';
import { ROLES } from '@/lib/roles';
import { createNotification, NOTIFICATION_TYPES } from '@/lib/notifications';
import { sendNotificationEmail } from '@/lib/email';
import { appendAuditLog } from '@/lib/audit-chain';

const InviteSchema = z.object({
  full_name: z.string().min(2, "Full name is required").max(100),
  email: z.string().email(),
  role: z.enum([ROLES.CLERK, ROLES.CONTROLLER, ROLES.CFO, ROLES.AUDITOR]),
  approval_limit: z.number().min(0).optional().default(0),
  can_unfreeze: z.boolean().optional().default(false)
});

export const GET = withAuth([ROLES.CFO], async (req, ctx, auth) => {
  try {
    const { data: teamMembers, error: usersError } = await auth.supabase
      .from('users')
      .select('id, email, full_name, role, approval_limit, can_unfreeze, created_at')
      .eq('company_id', auth.companyId)
      .order('created_at', { ascending: true });

    // Extended to fetch all historical invites, not just pending
    const { data: teamInvites, error: invitesError } = await auth.supabase
      .from('team_invites')
      .select('id, full_name, email, role, approval_limit, can_unfreeze, status, expires_at, created_at')
      .eq('company_id', auth.companyId)
      .order('created_at', { ascending: false });

    if (usersError || invitesError) throw new Error("Database fetch failed.");

    // Filter dynamic states
    const now = new Date();
    teamInvites?.forEach((inv: any) => {
      if (inv.status === 'pending' && new Date(inv.expires_at) < now) {
        inv.status = 'expired'; // Dynamically flag expired ones
      }
    });

    return NextResponse.json({ success: true, data: { teamMembers, teamInvites } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

export const POST = withAuth([ROLES.CFO], async (req, ctx, auth) => {
  try {
    const body = await req.json();
    const parsed = InviteSchema.parse(body);

    const adminClient = await getAdminClient();

    // 1. Check if user already exists anywhere in the platform (Strict 1-to-1 enforcement)
    const { data: existingUser } = await adminClient.from('users').select('id, company_id').eq('email', parsed.email).single();
    if (existingUser) {
      if (existingUser.company_id === auth.companyId) {
        return NextResponse.json({ error: 'User is already part of your team.' }, { status: 400 });
      } else {
        return NextResponse.json({ error: 'This email is already registered to a workspace. Multi-workspace support is currently disabled.' }, { status: 400 });
      }
    }

    // 2. Check if a pending invite already exists for this exact email in this company
    const { data: existingInvite } = await auth.supabase
      .from('team_invites')
      .select('id')
      .eq('company_id', auth.companyId)
      .eq('email', parsed.email)
      .eq('status', 'pending')
      .single();

    if (existingInvite) {
      return NextResponse.json({ error: 'An active invitation is already pending for this email.' }, { status: 400 });
    }

    // 3. Generate token and create invite
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // Extends to 7 days instead of 48h

    const { data: invite, error: insertError } = await auth.supabase.from('team_invites').insert([{
      company_id: auth.companyId,
      full_name: parsed.full_name,
      email: parsed.email,
      role: parsed.role,
      approval_limit: parsed.role === ROLES.CONTROLLER ? parsed.approval_limit : 0,
      can_unfreeze: parsed.role === ROLES.CONTROLLER ? parsed.can_unfreeze : false,
      invited_by: auth.userId,
      token: token,
      expires_at: expiresAt,
      status: 'pending'
    }]).select().single();

    if (insertError) throw insertError;

    // 4. WORM Audit Log
    await appendAuditLog(adminClient, {
      companyId: auth.companyId,
      wireId: null,
      actorId: auth.userId,
      action: 'INVITATION_CREATED',
      eventPayload: { invite_id: invite.id, email: parsed.email }
    });

    
    await createNotification(adminClient, {
      companyId: auth.companyId,
      userId: auth.userId,
      type: NOTIFICATION_TYPES.INVITE_SENT,
      title: 'Team Invitation Sent',
      message: `You invited ${parsed.email} to join the workspace.`,
      actionUrl: `/team`,
      relatedInviteId: invite.id,
    });
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const magicLink = `${siteUrl}/invite/${token}`;

    sendNotificationEmail({
      to: parsed.email,
      title: "You've been invited to join ClearWire",
      message: `You've been invited to join a ClearWire workspace as a ${parsed.role}. Click below to set up your account.`,
      actionUrl: `/invite/${token}`,
    }).catch(err => console.error('Failed to send invite email:', err));

    return NextResponse.json({ success: true, data: invite, magicLink });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create invite" }, { status: 500 });
  }
});
