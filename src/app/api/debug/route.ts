import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/api-auth';

export async function GET() {
  try {
    const admin = await getAdminClient();
    const { data, error } = await admin.from('vendor_change_requests').select('*').limit(1);
    return NextResponse.json({ data, error });
  } catch (err: any) {
    return NextResponse.json({ error: err.message });
  }
}
