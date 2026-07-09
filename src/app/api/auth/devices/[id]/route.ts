export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { ROLE_VALUES, ROLES } from '@/lib/roles';
import { z } from 'zod';

const UpdateDeviceSchema = z.object({
  name: z.string().min(1, "Device name is required").max(50)
});

// Rename a device
export const PATCH = withAuth([...ROLE_VALUES], async (req, { params }, auth) => {
  try {
    const body = await req.json();
    const parsed = UpdateDeviceSchema.parse(body);

    const { data: device, error: fetchError } = await auth.supabase.from('user_authenticators').select('user_id').eq('id', params.id).single();
    if (fetchError || !device) return NextResponse.json({ error: 'Device not found' }, { status: 404 });

    // Only the owner can rename their device
    if (device.user_id !== auth.userId) {
      return NextResponse.json({ error: 'Unauthorized to rename this device' }, { status: 403 });
    }

    const { error } = await auth.supabase.from('user_authenticators').update({ name: parsed.name }).eq('id', params.id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

// Revoke/Delete a device
export const DELETE = withAuth([...ROLE_VALUES], async (req, { params }, auth) => {
  try {
    const { data: device, error: fetchError } = await auth.supabase.from('user_authenticators').select('user_id').eq('id', params.id).single();
    if (fetchError || !device) return NextResponse.json({ error: 'Device not found' }, { status: 404 });

    // Enforce permissions: Must be the owner, OR must be the CFO
    if (device.user_id !== auth.userId && auth.role !== ROLES.CFO) {
      return NextResponse.json({ error: 'Unauthorized to revoke this device' }, { status: 403 });
    }

    const { error } = await auth.supabase.from('user_authenticators').delete().eq('id', params.id);
    if (error) throw error;

    // Log the revocation if it was an executive action
    if (device.user_id !== auth.userId && auth.role === ROLES.CFO) {
      await auth.supabase.from('audit_logs').insert([{
        company_id: auth.companyId,
        wire_id: '00000000-0000-0000-0000-000000000000',
        actor_id: auth.userId,
        action: 'CFO_REVOKED_DEVICE',
        new_hash: params.id,
        previous_hash: device.user_id
      }]);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
