import { NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { withAuth } from '@/lib/api-auth';

const InviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['clerk', 'controller', 'cfo', 'auditor'])
});

async function getAdminClient() {
  const { createClient: createAdmin } = await import('@supabase/supabase-js');
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing SERVICE_ROLE_KEY");
  return createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export const GET = withAuth(['cfo'], async (req, ctx, auth) => {
  try {
    // 1. Because the CFO is already authenticated and verified by 'withAuth',
    // we can safely use the Admin client to fetch the team roster.
    // This securely bypasses the restrictive RLS policy on the users table 
    // that prevents them from seeing anyone except themselves.
    const supabaseAdmin = await getAdminClient();

    const { data: teamMembers, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name, role, created_at')
      .eq('company_id', auth.companyId) // Critically scoped to their company only
      .order('created_at', { ascending: true });

    const { data: pendingInvites, error: invitesError } = await supabaseAdmin
      .from('team_invites')
      .select('id, email, role, status, expires_at, created_at')
      .eq('company_id', auth.companyId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (usersError || invitesError) throw new Error("Database fetch failed");

    // Force dynamic fetch
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

    const supabaseAdmin = await getAdminClient();

    const { data: existingUser } = await supabaseAdmin
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
