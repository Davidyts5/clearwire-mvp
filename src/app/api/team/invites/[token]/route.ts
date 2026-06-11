import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const AcceptInviteSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters long"),
  fullName: z.string().min(2, "Full name is required")
});

export async function GET(req: Request, { params }: { params: { token: string } }) {
  try {
    const supabase = createClient();
    
    // Validate the token exists and is not expired
    // Need to bypass RLS here because the user is not logged in yet when they click the email link
    const { data: invite, error } = await supabase
      .from('team_invites')
      .select('email, role, company_id, status, expires_at, companies(name)')
      .eq('token', params.token)
      .single();

    if (error || !invite) {
      return NextResponse.json({ error: 'Invalid or missing invite token' }, { status: 404 });
    }

    if (invite.status !== 'pending') {
      return NextResponse.json({ error: `Invite is already ${invite.status}` }, { status: 400 });
    }

    if (new Date() > new Date(invite.expires_at)) {
      return NextResponse.json({ error: 'Invite link has expired' }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      data: {
        email: invite.email,
        role: invite.role,
        companyName: invite.companies?.name
      } 
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Server error parsing token' }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: { token: string } }) {
  try {
    const supabase = createClient();
    const body = await req.json();
    const parsed = AcceptInviteSchema.parse(body);

    const { data: invite, error: inviteError } = await supabase
      .from('team_invites')
      .select('*')
      .eq('token', params.token)
      .eq('status', 'pending')
      .single();

    if (inviteError || !invite) return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 400 });

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: invite.email,
      password: parsed.password,
    });

    if (authError || !authData.user) {
      return NextResponse.json({ error: authError?.message || 'Failed to create secure account' }, { status: 400 });
    }

    const { error: dbError } = await supabase.from('users').insert([{
      id: authData.user.id,
      company_id: invite.company_id,
      email: invite.email,
      full_name: parsed.fullName,
      role: invite.role
    }]);

    if (dbError) {
      return NextResponse.json({ error: 'Failed to link account to company database. Check RLS policies.' }, { status: 500 });
    }

    // Since we created the user via backend API, we must force them to login via the frontend
    // to properly set the secure cookies.
    await supabase.from('team_invites').update({ status: 'accepted' }).eq('id', invite.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error accepting invite' }, { status: 500 });
  }
}
