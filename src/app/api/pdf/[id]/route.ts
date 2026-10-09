export const dynamic = "force-dynamic";
import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { getAdminClient, withAuth, verifyTenantResource } from '@/lib/api-auth';
import { ROLE_VALUES, ROLES } from '@/lib/roles';

function escapeHtml(value: unknown): string {
  const replacements: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };

  return String(value ?? '').replace(/[&<>"']/g, character => replacements[character]);
}

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

  // Clerks may view reports only for wires they created, matching the wire-detail endpoint.
  if (auth.role === ROLES.CLERK && data.clerk_id !== auth.userId) {
    return new NextResponse('Wire not found', { status: 404 });
  }

  let invoiceImageHtml = '';

  if (data.invoice_path) {
    const adminClient = await getAdminClient();
    const { data: urlData } = await adminClient.storage
      .from('invoices')
      .createSignedUrl(data.invoice_path, 3600); // Valid for 1 hour

    if (urlData?.signedUrl) {
      const signedUrl = escapeHtml(urlData.signedUrl);
      const isPdf = data.invoice_path.toLowerCase().endsWith('.pdf');

      if (isPdf) {
        invoiceImageHtml = `
          <div class="section-title">3. Source Document (Invoice)</div>
          <div style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 15px; border-radius: 6px; text-align: center;">
            <p><strong>PDF Document Attached</strong></p>
            <p style="font-size: 12px; color: #64748b;">The source document is a PDF and cannot be rendered directly inside this audit log. Please view the digital record in the ClearWire portal to download the original PDF invoice.</p>
            <a href="${signedUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; margin-top: 10px; color: #2563eb; text-decoration: underline; font-size: 12px;">View Original PDF</a>
          </div>
        `;
      } else {
        invoiceImageHtml = `
          <div class="section-title" style="page-break-before: always;">3. Source Document (Invoice)</div>
          <div style="text-align: center; border: 1px solid #e2e8f0; padding: 10px; background: #f8fafc; border-radius: 6px;">
            <img src="${signedUrl}" style="max-width: 100%; max-height: 800px; height: auto;" alt="Source Invoice Document" />
          </div>
        `;
      }
    }
  }

  const printNonce = crypto.randomBytes(16).toString('base64');
  const htmlContent = `
    <html>
      <head>
        <title>ClearWire Certificate - ${escapeHtml(data.id)}</title>
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
      <body>
        <div class="header">
          <h1>CLEARWIRE SECURE AUDIT LOG</h1>
          <div class="status">STATUS: ${escapeHtml(data.status)}</div>
        </div>

        <div class="section-title">1. Transaction Details</div>
        <div class="row"><div class="label">Transaction ID:</div><div class="value">${escapeHtml(data.id)}</div></div>
        <div class="row"><div class="label">Vendor Name:</div><div class="value">${escapeHtml(data.vendor_name_snapshot)}</div></div>
        <div class="row"><div class="label">Amount (USD):</div><div class="value">$${escapeHtml(Number(data.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}</div></div>
        <div class="row"><div class="label">Destination Account:</div><div class="value">***${escapeHtml(data.account_number_snapshot?.slice(-4) || 'N/A')}</div></div>
        <div class="row"><div class="label">Purpose / Invoice:</div><div class="value">${escapeHtml(data.purpose || 'N/A')}</div></div>

        <div class="section-title">2. Chain of Custody</div>
        <div class="row"><div class="label">Initiated By:</div><div class="value">${escapeHtml(data.clerk?.full_name || 'Unknown')} (${escapeHtml(data.clerk?.email || '')})</div></div>
        <div class="row"><div class="label">Initiated At:</div><div class="value">${escapeHtml(new Date(data.created_at).toLocaleString())}</div></div>
        <div class="row"><div class="label">Risk Score:</div><div class="value">${escapeHtml(data.risk_score)} / 100</div></div>

        ${data.status === 'approved' || data.status === 'denied' ? `
          <div class="row" style="margin-top: 15px;"><div class="label">Actioned By:</div><div class="value">${escapeHtml(data.cfo?.full_name || 'Unknown')} (${escapeHtml(data.cfo?.email || '')})</div></div>
          <div class="row"><div class="label">Actioned At:</div><div class="value">${escapeHtml(new Date(data.approved_at).toLocaleString())}</div></div>

          ${data.status === 'approved' ? `
            <div class="row"><div class="label">Authentication Method:</div><div class="value">Out-of-band Biometric (WebAuthn/FIDO2)</div></div>
            <div class="hash-box">
              <strong>HARDWARE CRYPTOGRAPHIC SIGNATURE:</strong><br/>
              ${escapeHtml(data.cryptographic_hash)}
              <br/><br/>
              <em>This hash mathematically verifies that the trusted executive device authorized this specific transaction amount and destination.</em>
            </div>
          ` : ''}
        ` : ''}

        ${invoiceImageHtml}

        <div class="footer">Generated by ClearWire Security - Immunizing B2B Payments Against Deepfakes</div>
        <script nonce="${printNonce}">
          window.addEventListener('load', () => window.setTimeout(() => window.print(), 500));
        </script>
      </body>
    </html>
  `;

  return new NextResponse(htmlContent, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, no-store, max-age=0',
      'Content-Security-Policy': `default-src 'none'; img-src 'self' https: data:; style-src 'unsafe-inline'; script-src 'nonce-${printNonce}'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'`,
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    },
  });
});
