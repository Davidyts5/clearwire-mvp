export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/api-auth';

export async function GET() {
  try {
    const admin = await getAdminClient();
    const { data: q1, error: e1 } = await admin.from('user_authenticators').select('id, name, created_at, last_used_at, transports, user_id, users!inner(full_name, email, role, company_id)').limit(1);
    return NextResponse.json({ auth: { q1, e1 } });
  } catch (err: any) {
    return NextResponse.json({ error: err.message });
  }
}
