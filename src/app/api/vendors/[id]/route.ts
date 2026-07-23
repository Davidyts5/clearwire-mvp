export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { withAuth, verifyTenantResource } from '@/lib/api-auth';
import { ROLE_VALUES, ROLES } from '@/lib/roles';
import { z } from 'zod';
import { appendAuditLog } from '@/lib/audit-chain';

export const GET = withAuth([...ROLE_VALUES], async (req, { params }, auth) => {
  try {
    await verifyTenantResource(auth.supabase, 'vendors', params.id, auth.companyId);
    const { data, error } = await auth.supabase.from('vendors').select('*').eq('id', params.id).single();
    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
});

// AP Clerk submits a Vendor Change Request via FormData
export const POST = withAuth([ROLES.CLERK], async (req, { params }, auth) => {
  try {
    await verifyTenantResource(auth.supabase, 'vendors', params.id, auth.companyId);
    const { data: vendor, error: vendorError } = await auth.supabase.from('vendors').select('*').eq('id', params.id).single();
    if (vendorError || !vendor) return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    if (vendor.status === 'restricted') {
      return NextResponse.json({ error: 'Vendor is restricted. Changes are not permitted.' }, { status: 403 });
    }
    
    const formData = await req.formData();
    
    // Construct new data payload
    const newData = {
      name: formData.get('name') as string,
      account_name: formData.get('account_name') as string || undefined,
      account_number: formData.get('account_number') as string,
      swift_bic: formData.get('swift_bic') as string || undefined,
      country: formData.get('country') as string,
      currency: formData.get('currency') as string,
      contact_email: formData.get('contact_email') as string || undefined,
      address: formData.get('address') as string || undefined,
      payment_instructions: formData.get('payment_instructions') as string || undefined,
    };

    const reason = formData.get('reason') as string;
    if (!reason || reason.trim() === '') return NextResponse.json({ error: 'Reason for change is required.' }, { status: 400 });
    if (!newData.name || !newData.account_number || !newData.country || !newData.currency) {
      return NextResponse.json({ error: 'Missing required vendor fields.' }, { status: 400 });
    }

    // Process optional document upload
    const documentFile = formData.get("document") as File;
    let storedDocumentPath = null;
    
    if (documentFile && documentFile.size > 0) {
      if (documentFile.size > 2 * 1024 * 1024) return NextResponse.json({ error: 'Document file exceeds 2MB limit.' }, { status: 400 });
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
      if (!allowedTypes.includes(documentFile.type)) return NextResponse.json({ error: 'Invalid file type. Only PDF, JPG, and PNG are allowed.' }, { status: 400 });

      const fileExt = documentFile.name.split('.').pop();
      const fileName = `vendor-docs/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${auth.companyId}/${fileName}`;

      const { data: uploadData, error: uploadError } = await auth.supabase.storage
        .from('invoices') // Reusing invoices bucket to avoid setup hassle
        .upload(filePath, documentFile, { cacheControl: '3600', upsert: false });

      if (!uploadError && uploadData) {
        storedDocumentPath = uploadData.path;
      }
    }

    // Extract exactly what we want to compare against
    const oldData = {
      name: vendor.name,
      account_name: vendor.account_name,
      account_number: vendor.account_number,
      swift_bic: vendor.swift_bic,
      country: vendor.country,
      currency: vendor.currency,
      contact_email: vendor.contact_email,
      address: vendor.address,
      payment_instructions: vendor.payment_instructions
    };

    // Insert the change request
    const { data: requestData, error } = await auth.supabase.from('vendor_change_requests').insert([{
      company_id: auth.companyId,
      vendor_id: params.id,
      requested_by: auth.userId,
      old_data: oldData,
      new_data: newData,
      reason: reason,
      document_path: storedDocumentPath,
      status: 'pending'
    }]).select().single();

    if (error) throw error;

    // Log the request to vendor history
    await auth.supabase.from('vendor_history').insert([{
      company_id: auth.companyId,
      vendor_id: params.id,
      actor_id: auth.userId,
      action: 'CHANGE_REQUESTED',
      details: { reason, request_id: requestData.id }
    }]);

    // WORM Audit Log
    await appendAuditLog(auth.supabase, {
      companyId: auth.companyId, wireId: null, actorId: auth.userId, action: 'VENDOR_CHANGE_REQUESTED', eventPayload: { vendor_id: params.id }
    });

    return NextResponse.json({ success: true, data: requestData });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
