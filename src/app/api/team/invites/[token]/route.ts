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
    // 1. We must bypass the standard authenticated client here because the user is NOT logged in yet.
    // If we use the standard SSR client with RLS, the database will block the insert into the 'users' table.
    // We instantiate the Service Role client to forcefully provision the account.
    const { createClient: createAdminClient } = await import('@supabase/supabase-js');
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // Requires the secret Service Role key
    );

    // Fallback: If the user hasn't added the Service Role key to Vercel yet, 
    // we use the standard client but it might fail RLS. 
    // (We will instruct the user to add the Service Role key).
    const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY 
      ? supabaseAdmin 
      : createClient();

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

    // 2. Insert into the public.users table (This is what failed in the screenshot due to RLS)
    const { error: dbError } = await supabase.from('users').insert([{
      id: authData.user.id,
      company_id: invite.company_id,
      email: invite.email,
      full_name: parsed.fullName,
      role: invite.role
    }]);

    if (dbError) {
      console.error("DB User Insert Error:", dbError);
      
      // If the insert fails, we must attempt to delete the orphaned Auth account
      if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
         await supabase.auth.admin.deleteUser(authData.user.id);
      }
      
      return NextResponse.json({ 
        error: 'Failed to link account to company database. Please ensure you have added the SUPABASE_SERVICE_ROLE_KEY to Vercel.' 
      }, { status: 500 });
    }

    await supabase.from('team_invites').update({ status: 'accepted' }).eq('id', invite.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Invite Accept Catch Error:", error);
    return NextResponse.json({ error: error.message || 'Server error accepting invite' }, { status: 500 });
  }
}
