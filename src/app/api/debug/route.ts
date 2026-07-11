export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/api-auth';

export async function GET() {
  try {
    const admin = await getAdminClient();
    const { data, error } = await admin.from('user_authenticators')
      .select('id, user_id, credential_id, public_key:credential_public_key, device_name, device_type:credential_device_type, created_at, last_used_at, revoked')
      .limit(1);
    return NextResponse.json({ data, error });
  } catch (err: any) {
    return NextResponse.json({ error: err.message });
  }
}
