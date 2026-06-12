import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api-auth';

const SettingsSchema = z.object({
  controller_limit: z.number().min(0, "Limit cannot be negative")
});

export const GET = withAuth(['cfo'], async (req, ctx, auth) => {
  try {
    let { data, error } = await auth.supabase
      .from('company_settings')
      .select('*')
      .eq('company_id', auth.companyId)
      .single();

    if (!data) {
      const defaultSettings = {
        company_id: auth.companyId,
        approval_tiers: { tier1: { max: 10000, role: "controller" } }
      };
      
      const { data: newSettings, error: insertError } = await auth.supabase
        .from('company_settings')
        .insert([defaultSettings])
        .select()
        .single();
        
      if (insertError) throw insertError;
      data = newSettings;
    }

    const headers = new Headers();
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    headers.set('Pragma', 'no-cache');
    headers.set('Expires', '0');

    return NextResponse.json({ success: true, data }, { status: 200, headers });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

export const PUT = withAuth(['cfo'], async (req, ctx, auth) => {
  try {
    const body = await req.json();
    const parsed = SettingsSchema.parse(body);

    const updatedTiers = {
      tier1: { max: parsed.controller_limit, role: "controller" }
    };

    const { data, error } = await auth.supabase
      .from('company_settings')
      .upsert({ 
        company_id: auth.companyId, 
        approval_tiers: updatedTiers,
        updated_at: new Date().toISOString()
      }, { onConflict: 'company_id' })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
