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
    
    const { data: invite, error } = await supabase
      .from('team_invites')
      .select('email, role, company_id, status, expires_at, companies(name)')
      .eq('token', params.token)
      .single();

    if (error || !invite) return NextResponse.json({ error: 'Invalid or missing invite token' }, { status: 404 });
    if (invite.status !== 'pending') return NextResponse.json({ error: `Invite is already ${invite.status}` }, { status: 400 });
    if (new Date() > new Date(invite.expires_at)) return NextResponse.json({ error: 'Invite link has expired' }, { status: 400 });

    return NextResponse.json({ success: true, data: { email: invite.email, role: invite.role, companyName: invite.companies?.name } });
  } catch (error: any) {
    return NextResponse.json({ error: 'Server error parsing token' }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: { token: string } }) {
  try {
    const body = await req.json();
    const parsed = AcceptInviteSchema.parse(body);
    const supabase = createClient();

    const { data: invite, error: inviteError } = await supabase
      .from('team_invites')
      .select('*')
      .eq('token', params.token)
      .eq('status', 'pending')
      .single();

    if (inviteError || !invite) return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 400 });

    const { data: authData, error: authError } = await supabase.auth.signUp({ email: invite.email, password: parsed.password });
    if (authError || !authData.user) return NextResponse.json({ error: authError?.message || 'Failed to create secure account' }, { status: 400 });

    const { error: dbError } = await supabase.rpc('provision_invited_user', {
      p_user_id: authData.user.id,
      p_company_id: invite.company_id,
      p_email: invite.email,
      p_full_name: parsed.fullName,
      p_role: invite.role,
      p_invite_id: invite.id,
      p_approval_limit: invite.approval_limit || 0
    });

    if (dbError) {
      const { createClient: createAdminClient } = await import('@supabase/supabase-js');
      if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
         const adminClient = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY);
         await adminClient.auth.admin.deleteUser(authData.user.id);
      }
      return NextResponse.json({ error: `Provisioning RPC Failed: ${dbError.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error accepting invite' }, { status: 500 });
  }
}
