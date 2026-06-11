import { NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { withAuth } from '@/lib/api-auth';

const InviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['clerk', 'controller', 'cfo', 'auditor'])
});

export const GET = withAuth(['cfo'], async (req, ctx, auth) => {
  try {
    const { data: teamMembers, error: usersError } = await auth.supabase
      .from('users')
      .select('id, email, full_name, role, created_at')
      .eq('company_id', auth.companyId)
      .order('created_at', { ascending: true });

    const { data: pendingInvites, error: invitesError } = await auth.supabase
      .from('team_invites')
      .select('id, email, role, status, expires_at, created_at')
      .eq('company_id', auth.companyId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (usersError || invitesError) throw new Error("Database fetch failed");

    // FIX: Force dynamic data fetch, explicitly bypassing Next.js cache
    const headers = new Headers();
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    headers.set('Pragma', 'no-cache');
    headers.set('Expires', '0');

    return NextResponse.json(
      { success: true, data: { teamMembers, pendingInvites } },
      { status: 200, headers }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

export const POST = withAuth(['cfo'], async (req, ctx, auth) => {
  try {
    const body = await req.json();
    const parsed = InviteSchema.parse(body);

    const { data: existingUser } = await auth.supabase
      .from('users')
      .select('id')
      .eq('company_id', auth.companyId)
      .eq('email', parsed.email)
      .single();

    if (existingUser) {
      return NextResponse.json({ error: 'User is already part of the team.' }, { status: 400 });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    const { data: invite, error: insertError } = await auth.supabase
      .from('team_invites')
      .insert([{
        company_id: auth.companyId,
        email: parsed.email,
        role: parsed.role,
        invited_by: auth.userId,
        token: token,
        expires_at: expiresAt
      }])
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: 'An invite is already pending for this email.' }, { status: 400 });
    }

    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const magicLink = `${protocol}://${host}/invite/${token}`;

    return NextResponse.json({ success: true, data: invite, magicLink });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create invite" }, { status: 500 });
  }
});
