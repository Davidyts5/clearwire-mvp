export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { getRpId } from '@/lib/webauthn';
import { withAuth } from '@/lib/api-auth';
import { ROLE_VALUES } from '@/lib/roles';

export const GET = withAuth([...ROLE_VALUES], async (req, { params }, auth) => {
  try {
    const { data: authenticators, error: fetchError } = await auth.supabase
      .from('user_authenticators')
      .select('credential_id, transports')
      .eq('user_id', auth.userId)
      .eq('revoked', false);

    if (fetchError || !authenticators || authenticators.length === 0) {
      return NextResponse.json({ error: 'No active authenticators found.' }, { status: 400 });
    }

    const options = await generateAuthenticationOptions({
      rpID: getRpId(req),
      allowCredentials: authenticators.map((a: any) => ({
        id: a.credential_id,
        type: 'public-key',
        transports: a.transports || [],
      })),
      userVerification: 'required',
    });

    await auth.supabase.from('webauthn_challenges').delete().eq('user_id', auth.userId).eq('context', 'revoke');

    const { error: insertError } = await auth.supabase.from('webauthn_challenges').insert([{
      user_id: auth.userId,
      challenge: options.challenge,
      context: 'revoke',
      expires_at: new Date(Date.now() + 5 * 60000).toISOString()
    }]);

    if (insertError) throw insertError;

    return NextResponse.json(options);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
