export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { withAuth, getAdminClient } from '@/lib/api-auth';
import { ROLES } from '@/lib/roles';
import { getRiskTrendData, getVendorLeaderboardData } from '@/lib/analytics-utils';
import { verifyCompanyChain, canonicalJSON, appendAuditLog } from '@/lib/audit-chain';
import crypto from 'crypto';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
// Adjust top margin to make room for the branded header band without overlapping
const MARGIN = 50;
const HEADER_HEIGHT = 50;
const TOP_MARGIN = MARGIN + HEADER_HEIGHT + 20; 
const BOTTOM_MARGIN = MARGIN + 30; // Room for footer
const MAX_WIDTH = PAGE_WIDTH - MARGIN * 2;

function wrapText(text: string, font: any, size: number, maxWidth: number): string[] {
  const words = String(text ?? '').split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export const POST = withAuth([ROLES.AUDITOR, ROLES.CFO], async (req, { params }, auth) => {
  try {
    const { startDate, endDate } = await req.json();
    if (!startDate || !endDate) return NextResponse.json({ error: "startDate and endDate are required" }, { status: 400 });

    const adminClient = await getAdminClient();

    // 1. Fetch Company Name & User
    const { data: comp } = await auth.supabase.from('companies').select('name').eq('id', auth.companyId).single();
    const { data: user } = await auth.supabase.from('users').select('full_name').eq('id', auth.userId).single();
    const companyName = comp?.name || 'Unknown Company';
    const generatedBy = user?.full_name || 'Unknown Auditor';

    // 2. Fetch Data
    const riskData = await getRiskTrendData(auth.supabase, auth.companyId, 'day', startDate, endDate);
    const vendorData = await getVendorLeaderboardData(auth.supabase, auth.companyId, startDate, endDate);
    
    let offset = 0;
    const cases = [];
    while (true) {
      let q = auth.supabase.from('investigations')
        .select('case_number, status, resolved_at, resolution_notes, vendors(name), wire_requests(vendor_name_snapshot)')
        .eq('company_id', auth.companyId)
        .gte('created_at', startDate)
        .lte('created_at', endDate);
      const { data, error } = await q.order('created_at', { ascending: true }).order('id', { ascending: true }).range(offset, offset + 999);
      if (error) throw error;
      cases.push(...data);
      if (data.length < 1000) break;
      offset += 1000;
    }

    const chainData = await verifyCompanyChain(auth.supabase, auth.companyId, startDate, endDate);

    // 3. Compute Hash
    const reportData = {
      period: { startDate, endDate },
      totals: riskData.totals,
      vendors: vendorData,
      cases: cases.map(c => ({
         case_number: c.case_number,
         status: c.status,
         vendor: c.vendors?.name || c.wire_requests?.vendor_name_snapshot || 'Unknown',
         resolution: c.resolution_notes || null
      })),
      integrity: {
        totalRecords: chainData.totalRecords,
        validCount: chainData.validCount,
        invalidIds: chainData.invalidIds,
        historicalPlaceholderCount: chainData.historicalPlaceholderCount
      }
    };

    const reportHash = crypto.createHash('sha256').update(canonicalJSON(reportData)).digest('hex');

    // 4. Draw PDF
    const pdfDoc = await PDFDocument.create();
    
    // Switch to Courier for typewriter look
    const font = await pdfDoc.embedFont(StandardFonts.Courier);
    const bold = await pdfDoc.embedFont(StandardFonts.CourierBold);

    // Colors
    const darkNavy = rgb(0.06, 0.09, 0.16);
    const textGray = rgb(0.2, 0.2, 0.2);
    const bgGray = rgb(0.95, 0.96, 0.97);
    const colorGreen = rgb(0.05, 0.5, 0.35);
    const colorRed = rgb(0.7, 0.15, 0.1);
    const colorGray = rgb(0.5, 0.5, 0.5);

    let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = PAGE_HEIGHT - TOP_MARGIN;

    const drawHeaderBand = (p: any) => {
      p.drawRectangle({
        x: 0,
        y: PAGE_HEIGHT - HEADER_HEIGHT,
        width: PAGE_WIDTH,
        height: HEADER_HEIGHT,
        color: darkNavy,
      });
      p.drawText('ClearWire', { x: MARGIN, y: PAGE_HEIGHT - 30, size: 14, font: bold, color: rgb(1, 1, 1) });
      p.drawText('Compliance Report', { x: MARGIN + 100, y: PAGE_HEIGHT - 30, size: 12, font, color: rgb(0.8, 0.8, 0.8) });
    };

    // Draw header on first page
    drawHeaderBand(page);

    const ensureSpace = (needed: number) => {
      if (y - needed < BOTTOM_MARGIN) {
        page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        drawHeaderBand(page);
        y = PAGE_HEIGHT - TOP_MARGIN;
      }
    }

    const heading = (text: string) => {
      ensureSpace(40);
      y -= 10;
      page.drawText(text, { x: MARGIN, y, size: 12, font: bold, color: darkNavy });
      y -= 5;
      page.drawLine({
        start: { x: MARGIN, y },
        end: { x: PAGE_WIDTH - MARGIN, y },
        thickness: 0.5,
        color: textGray
      });
      y -= 20;
    }

    const line = (text: string, size = 10, isBold = false) => {
      const f = isBold ? bold : font;
      const wrapped = wrapText(text, f, size, MAX_WIDTH);
      for (const l of wrapped) {
        ensureSpace(size + 6);
        page.drawText(l, { x: MARGIN, y, size, font: f, color: textGray });
        y -= size + 6;
      }
    }

    const getStatusColor = (status: string) => {
      const s = status.toLowerCase();
      if (s === 'approved' || s === 'resolved') return colorGreen;
      if (s === 'denied' || s === 'rejected') return colorRed;
      return colorGray; // pending/open/frozen
    };

    // Cover Info
    y -= 10;
    line(`Company: ${companyName}`, 12, true);
    line(`Period: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`);
    line(`Generated: ${new Date().toLocaleString()}`);
    line(`Generated By: ${generatedBy}`);
    y -= 15;

    // Report Hash Box
    ensureSpace(40);
    page.drawRectangle({
      x: MARGIN,
      y: y - 25,
      width: MAX_WIDTH,
      height: 35,
      color: bgGray,
    });
    page.drawText(`Report Content Hash: ${reportHash}`, { x: MARGIN + 10, y: y - 5, size: 9, font: bold, color: darkNavy });
    page.drawText(`Cryptographically verifies the underlying data output of this exact report run.`, { x: MARGIN + 10, y: y - 18, size: 7, font: font, color: textGray });
    y -= 45;


    // Summary
    heading('1. SUMMARY OF WIRE REQUESTS');
    line(`Total Wires Processed: ${riskData.totals.totalWires}`);
    
    // Draw status with colors
    ensureSpace(16);
    page.drawText('Approved:', { x: MARGIN, y, size: 10, font: font, color: textGray });
    page.drawText(`${riskData.totals.statusCounts.approved || 0}`, { x: MARGIN + 80, y, size: 10, font: bold, color: getStatusColor('approved') });
    y -= 16;

    ensureSpace(16);
    page.drawText('Denied:', { x: MARGIN, y, size: 10, font: font, color: textGray });
    page.drawText(`${riskData.totals.statusCounts.denied || 0}`, { x: MARGIN + 80, y, size: 10, font: bold, color: getStatusColor('denied') });
    y -= 16;

    ensureSpace(16);
    page.drawText('Pending:', { x: MARGIN, y, size: 10, font: font, color: textGray });
    page.drawText(`${(riskData.totals.statusCounts.pending || 0) + (riskData.totals.statusCounts.under_review || 0)}`, { x: MARGIN + 80, y, size: 10, font: bold, color: getStatusColor('pending') });
    y -= 16;

    line(`Frozen for Review (High Risk): ${(riskData.totals.statusCounts.frozen || 0)}`);

    y -= 10;
    heading('2. RISK REASON BREAKDOWN');
    const reasons = Object.entries(riskData.totals.reasons).sort((a: any, b: any) => b[1] - a[1]);
    if (reasons.length === 0) {
      line('No risk flags triggered in this period.');
    } else {
      for (const [code, count] of reasons) {
        line(`${code}: ${count}`);
      }
    }

    // Vendors
    heading('3. VENDOR RISK LEADERBOARD (PERIOD)');
    if (vendorData.length === 0) {
      line('No vendor activity in this period.');
    } else {
      for (const v of vendorData.slice(0, 15)) {
        line(`${v.vendor_name} — Wires: ${v.total_wires}, Avg Risk: ${v.avg_risk_score}, Bank Flags: ${v.flag_count}`);
      }
      if (vendorData.length > 15) line(`... and ${vendorData.length - 15} more.`);
    }

    // Cases
    heading('4. COMPLIANCE INVESTIGATIONS');
    if (cases.length === 0) {
      line('No investigations opened in this period.');
    } else {
      for (const c of cases) {
        const vName = c.vendors?.name || c.wire_requests?.vendor_name_snapshot || 'Unknown';
        
        ensureSpace(16);
        const prefix = `[${c.case_number}] ${vName} - Status: `;
        page.drawText(prefix, { x: MARGIN, y, size: 10, font: font, color: textGray });
        page.drawText(`${c.status.toUpperCase()}`, { x: MARGIN + font.widthOfTextAtSize(prefix, 10), y, size: 10, font: bold, color: getStatusColor(c.status) });
        y -= 16;

        if (c.status === 'resolved' && c.resolution_notes) {
          line(`   Resolution: ${c.resolution_notes}`, 9);
        } else if (c.status !== 'resolved') {
          line(`   Resolution: Case remains open.`, 9);
        }
        y -= 5;
      }
    }

    // Integrity
    heading('5. AUDIT LOG INTEGRITY ATTESTATION');
    line(`Total audit records in period: ${chainData.totalRecords}`);
    line(`Cryptographically verified records: ${chainData.validCount}`);
    
    ensureSpace(16);
    if (chainData.invalidIds.length > 0) {
      page.drawText(`FAILED VERIFICATION: ${chainData.invalidIds.length} records. Chain is broken!`, { x: MARGIN, y, size: 10, font: bold, color: colorRed });
    } else {
      page.drawText(`All modern records cryptographically verified: PASS`, { x: MARGIN, y, size: 10, font: bold, color: colorGreen });
    }
    y -= 16;

    if (chainData.historicalPlaceholderCount > 0) {
      y -= 5;
      line(`* Note: ${chainData.historicalPlaceholderCount} records in this period predate strict hashing and use historical placeholders.`, 9);
    }

    // Add Footers
    const pages = pdfDoc.getPages();
    for (let i = 0; i < pages.length; i++) {
      const p = pages[i];
      p.drawText(`Page ${i + 1} of ${pages.length}`, { x: PAGE_WIDTH / 2 - 30, y: 30, size: 9, font: font, color: colorGray });
      p.drawText(`Generated by ClearWire`, { x: MARGIN, y: 30, size: 8, font: font, color: colorGray });
    }

    // 5. Append Audit Log
    await appendAuditLog(adminClient, {
      companyId: auth.companyId,
      wireId: null,
      actorId: auth.userId,
      action: 'COMPLIANCE_REPORT_GENERATED',
      eventPayload: { startDate, endDate, reportHash, generatedBy }
    });

    const pdfBytes = await pdfDoc.save();
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="compliance-report-${new Date().toISOString().split('T')[0]}.pdf"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
