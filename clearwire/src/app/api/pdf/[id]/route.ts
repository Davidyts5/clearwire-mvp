import { NextResponse } from 'next/server';
import { withAuth, verifyTenantResource } from '@/lib/api-auth';
import { ROLE_VALUES } from '@/lib/roles';
import { createClient } from '@/lib/supabase/server';

export const GET = withAuth([...ROLE_VALUES], async (req, { params }, auth) => {
  await verifyTenantResource(auth.supabase, 'wire_requests', params.id, auth.companyId);

  const { data, error } = await auth.supabase
    .from('wire_requests')
    .select(`
      *,
      clerk:clerk_id (full_name, email),
      cfo:cfo_id (full_name, email)
    `)
    .eq('id', params.id)
    .single();

  if (error || !data) return new NextResponse('Wire not found', { status: 404 });

  let invoiceImageHtml = '';
  
  if (data.invoice_path) {
    // Generate a secure, temporary URL for the invoice
    // Using the admin client to ensure we can generate the signed URL correctly
    const { createClient: createAdminClient } = await import('@supabase/supabase-js');
    const adminClient = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    
    const { data: urlData } = await adminClient.storage
      .from('invoices')
      .createSignedUrl(data.invoice_path, 3600); // Valid for 1 hour

    if (urlData?.signedUrl) {
      // Determine if it is a PDF or an Image based on the file extension
      const isPdf = data.invoice_path.toLowerCase().endsWith('.pdf');
      
      if (isPdf) {
        invoiceImageHtml = `
          <div class="section-title">3. Source Document (Invoice)</div>
          <div style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 15px; border-radius: 6px; text-align: center;">
            <p><strong>PDF Document Attached</strong></p>
            <p style="font-size: 12px; color: #64748b;">The source document is a PDF and cannot be rendered directly inside this audit log. Please view the digital record in the ClearWire portal to download the original PDF invoice.</p>
            <a href="${urlData.signedUrl}" target="_blank" style="display: inline-block; margin-top: 10px; color: #2563eb; text-decoration: underline; font-size: 12px;">View Original PDF</a>
          </div>
        `;
      } else {
        invoiceImageHtml = `
          <div class="section-title" style="page-break-before: always;">3. Source Document (Invoice)</div>
          <div style="text-align: center; border: 1px solid #e2e8f0; padding: 10px; background: #f8fafc; border-radius: 6px;">
            <img src="${urlData.signedUrl}" style="max-width: 100%; max-height: 800px; height: auto;" alt="Source Invoice Document" />
          </div>
        `;
      }
    }
  }

  const htmlContent = `
    <html>
      <head>
        <title>ClearWire Certificate - ${data.id}</title>
        <style>
          body { font-family: 'Courier New', Courier, monospace; padding: 40px; color: #1e293b; background: #ffffff; }
          .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
          h1 { color: #0f172a; font-size: 24px; margin: 0; }
          .status { color: ${data.status === 'approved' ? '#059669' : data.status === 'denied' ? '#dc2626' : '#d97706'}; font-weight: bold; font-size: 18px; margin-top: 10px; text-transform: uppercase; }
          .section-title { font-size: 14px; font-weight: bold; color: #0f172a; margin-top: 30px; margin-bottom: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; text-transform: uppercase; }
          .row { margin-bottom: 10px; display: flex; font-size: 13px; }
          .label { font-weight: bold; width: 180px; color: #64748b; }
          .value { flex: 1; color: #0f172a; font-weight: 500; }
          .hash-box { background: #f8fafc; border: 1px solid #cbd5e1; padding: 15px; margin-top: 30px; word-break: break-all; font-size: 12px; border-radius: 6px; }
          .footer { margin-top: 50px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px dashed #e2e8f0; padding-top: 20px; }
          @media print { 
            body { padding: 0; } 
            .section-title { break-after: avoid; }
          }
        </style>
      </head>
      <body onload="setTimeout(() => window.print(), 500)">
        <div class="header">
          <h1>CLEARWIRE SECURE AUDIT LOG</h1>
          <div class="status">STATUS: ${data.status}</div>
        </div>
        
        <div class="section-title">1. Transaction Details</div>
        <div class="row"><div class="label">Transaction ID:</div><div class="value">${data.id}</div></div>
        <div class="row"><div class="label">Vendor Name:</div><div class="value">${data.vendor_name_snapshot}</div></div>
        <div class="row"><div class="label">Amount (USD):</div><div class="value">$${Number(data.amount).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div></div>
        <div class="row"><div class="label">Destination Account:</div><div class="value">***${data.account_number_snapshot?.slice(-4) || 'N/A'}</div></div>
        <div class="row"><div class="label">Purpose / Invoice:</div><div class="value">${data.purpose || 'N/A'}</div></div>
        
        <div class="section-title">2. Chain of Custody</div>
        <div class="row"><div class="label">Initiated By:</div><div class="value">${data.clerk?.full_name || 'Unknown'} (${data.clerk?.email || ''})</div></div>
        <div class="row"><div class="label">Initiated At:</div><div class="value">${new Date(data.created_at).toLocaleString()}</div></div>
        <div class="row"><div class="label">Risk Score:</div><div class="value">${data.risk_score} / 100</div></div>

        ${data.status === 'approved' || data.status === 'denied' ? `
          <div class="row" style="margin-top: 15px;"><div class="label">Actioned By:</div><div class="value">${data.cfo?.full_name || 'Unknown'} (${data.cfo?.email || ''})</div></div>
          <div class="row"><div class="label">Actioned At:</div><div class="value">${new Date(data.approved_at).toLocaleString()}</div></div>
          
          ${data.status === 'approved' ? `
            <div class="row"><div class="label">Authentication Method:</div><div class="value">Out-of-band Biometric (WebAuthn/FIDO2)</div></div>
            <div class="hash-box">
              <strong>HARDWARE CRYPTOGRAPHIC SIGNATURE:</strong><br/>
              ${data.cryptographic_hash}
              <br/><br/>
              <em>This hash mathematically verifies that the trusted executive device authorized this specific transaction amount and destination.</em>
            </div>
          ` : ''}
        ` : ''}

        ${invoiceImageHtml}

        <div class="footer">Generated by ClearWire Security - Immunizing B2B Payments Against Deepfakes</div>
      </body>
    </html>
  `;

  return new NextResponse(htmlContent, { headers: { 'Content-Type': 'text/html' } });
});
