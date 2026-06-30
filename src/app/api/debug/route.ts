import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/api-auth';

export async function GET() {
  try {
    const admin = await getAdminClient();
    const { data: users, error } = await admin.from('users').select('id, role, approval_limit').limit(5);
    return NextResponse.json({ users, error });
  } catch (err: any) {
    return NextResponse.json({ error: err.message });
  }
}
