export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { ROLE_VALUES } from '@/lib/roles';
import { z } from 'zod';

const UpdateDeviceSchema = z.object({
  device_name: z.string().min(1, "Device name is required").max(50)
});

export const PATCH = withAuth([...ROLE_VALUES], async (req, { params }, auth) => {
  try {
    const body = await req.json();
    const parsed = UpdateDeviceSchema.parse(body);

    const { data: device, error: fetchError } = await auth.supabase
      .from('user_authenticators')
      .select('user_id, revoked')
      .eq('id', params.id)
      .single();

    if (fetchError || !device) return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    if (device.user_id !== auth.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    if (device.revoked) return NextResponse.json({ error: 'Cannot modify a revoked device' }, { status: 400 });

    const { error } = await auth.supabase
      .from('user_authenticators')
      .update({ device_name: parsed.device_name })
      .eq('id', params.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

export const DELETE = withAuth([...ROLE_VALUES], async (req, { params }, auth) => {
  try {
    const { data: device, error: fetchError } = await auth.supabase
      .from('user_authenticators')
      .select('user_id')
      .eq('id', params.id)
      .single();

    if (fetchError || !device) return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    if (device.user_id !== auth.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    // Soft Revoke
    const { error } = await auth.supabase
      .from('user_authenticators')
      .update({ revoked: true })
      .eq('id', params.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
