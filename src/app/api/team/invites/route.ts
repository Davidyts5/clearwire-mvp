import { NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { withAuth, getAdminClient } from '@/lib/api-auth';
import { ROLES } from '@/lib/roles';
import { checkRateLimit } from '@/lib/rate-limit';

const InviteSchema = z.object({
  email: z.string().email(),
  role: z.enum([ROLES.CLERK, ROLES.CONTROLLER, ROLES.CFO, ROLES.AUDITOR]),
  approval_limit: z.number().min(0).optional().default(0)
});

export const GET = withAuth([ROLES.CFO], async (req, ctx, auth) => {
  try {
    const { data: teamMembers, error: usersError } = await auth.supabase
      .from('users')
      .select('id, email, full_name, role, approval_limit, created_at')
      .eq('company_id', auth.companyId)
      .order('created_at', { ascending: true });

    const { data: pendingInvites, error: invitesError } = await auth.supabase
      .from('team_invites')
      .select('id, email, role, approval_limit, status, expires_at, created_at')
      .eq('company_id', auth.companyId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (usersError || invitesError) throw new Error("Database fetch failed due to RLS or missing tables.");

    const headers = new Headers();
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

    return NextResponse.json({ success: true, data: { teamMembers, pendingInvites } }, { status: 200, headers });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

export const POST = withAuth([ROLES.CFO], async (req, ctx, auth) => {
  try {
    // RATE LIMITING FIX
    const isAllowed = checkRateLimit(`invite_${auth.userId}`, 10, 60000);
    if (!isAllowed) {
      return NextResponse.json({ error: 'Rate limit exceeded. Please wait 60 seconds.' }, { status: 429 });
    }

    const body = await req.json();
    const parsed = InviteSchema.parse(body);

    const { data: existingUser } = await auth.supabase
      .from('users')
      .select('id')
      .eq('company_id', auth.companyId)
      .eq('email', parsed.email)
      .single();

    if (existingUser) return NextResponse.json({ error: 'User is already part of the team.' }, { status: 400 });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    const { data: invite, error: insertError } = await auth.supabase
      .from('team_invites')
      .insert([{
        company_id: auth.companyId,
        email: parsed.email,
        role: parsed.role,
        approval_limit: parsed.role === ROLES.CONTROLLER ? parsed.approval_limit : 0,
        invited_by: auth.userId,
        token: token,
        expires_at: expiresAt
      }])
      .select()
      .single();

    if (insertError) return NextResponse.json({ error: 'An invite is already pending for this email.' }, { status: 400 });

    await auth.supabase.from('audit_logs').insert([{
      company_id: auth.companyId,
      wire_id: '00000000-0000-0000-0000-000000000000', 
      actor_id: auth.userId,
      action: `INVITE_CREATED_FOR_${parsed.role.toUpperCase()}`,
      new_hash: token
    }]);

    // HOST-HEADER INJECTION FIX
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const magicLink = `${siteUrl}/invite/${token}`;

    return NextResponse.json({ success: true, data: invite, magicLink });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create invite" }, { status: 500 });
  }
});
