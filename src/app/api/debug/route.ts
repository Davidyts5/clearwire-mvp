export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/api-auth';

export async function GET() {
  try {
    const admin = await getAdminClient();
    const { data: q1, error: e1 } = await admin.from('user_authenticators').select('*').limit(1);
    const { data: q2, error: e2 } = await admin.from('users').select('*').limit(1);
    return NextResponse.json({ auth: { q1, e1 }, users: { q2, e2 } });
  } catch (err: any) {
    return NextResponse.json({ error: err.message });
  }
}
