import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { ROLES, ROLE_VALUES } from '@/lib/roles';

// GET Settings
export const GET = withAuth([...ROLE_VALUES], async (req, ctx, auth) => {
  try {
    let { data, error } = await auth.supabase
      .from('company_settings')
      .select('*')
      .eq('company_id', auth.companyId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        const { data: newData, error: insertError } = await auth.supabase
          .from('company_settings')
          .insert([{ company_id: auth.companyId }])
          .select('*')
          .single();
        if (insertError) throw insertError;
        data = newData;
      } else {
        throw error;
      }
    }
    
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

// UPDATE Settings
export const PUT = withAuth([ROLES.CFO], async (req, ctx, auth) => {
  try {
    const body = await req.json();
    
    const updatePayload: any = { updated_at: new Date().toISOString() };
    
    if (body.controller_limit !== undefined) {
      updatePayload.approval_tiers = {
        tier1: { max: Number(body.controller_limit), role: "controller" },
        tier2: { max: 100000, role: "cfo" },
        tier3: { max: null, role: "multi-sig" }
      };
    }
    
    if (body.risk_profile !== undefined) updatePayload.risk_profile = body.risk_profile;
    if (body.freeze_first_payment !== undefined) updatePayload.freeze_first_payment = body.freeze_first_payment;
    if (body.freeze_bank_changes !== undefined) updatePayload.freeze_bank_changes = body.freeze_bank_changes;
    if (body.freeze_international_payment !== undefined) updatePayload.freeze_international_payment = body.freeze_international_payment;
    if (body.freeze_missing_invoice !== undefined) updatePayload.freeze_missing_invoice = body.freeze_missing_invoice;
    if (body.freeze_high_risk_countries !== undefined) updatePayload.freeze_high_risk_countries = body.freeze_high_risk_countries;
    if (body.freeze_above_amount !== undefined) updatePayload.freeze_above_amount = body.freeze_above_amount;
    if (body.freeze_amount_threshold !== undefined) updatePayload.freeze_amount_threshold = body.freeze_amount_threshold;

    const { data, error } = await auth.supabase
      .from('company_settings')
      .update(updatePayload)
      .eq('company_id', auth.companyId)
      .select('*')
      .single();

    if (error) throw error;
    
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
