import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/api-auth';

export async function GET() {
  try {
    const admin = await getAdminClient();
    const { data, error } = await admin.rpc('run_sql', { query: "SELECT column_name FROM information_schema.columns WHERE table_name = 'vendors';" });
    if (error) {
      const { data: q2, error: e2 } = await admin.from('vendors').select('*').order('created_at', { ascending: false }).limit(2);
      return NextResponse.json({ fallback: q2, e2 });
    }
    return NextResponse.json({ columns: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message });
  }
}
