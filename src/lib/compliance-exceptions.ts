export type ExceptionWire = {
  id: string;
  vendor_id: string | null;
  vendor_name_snapshot: string | null;
  amount: number | string;
  currency: string | null;
  created_at: string;
  risk_score: number | null;
  status: string;
};

export type ApprovedVendorChange = {
  vendor_id: string;
  status: string;
  reviewed_at: string | null;
};

export type ComplianceException = ExceptionWire & { reasons: string[] };
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/** reviewed_at is the approval timestamp in the vendor review workflow. */
export function findComplianceExceptions(
  wires: ExceptionWire[],
  changes: ApprovedVendorChange[],
): ComplianceException[] {
  const approvals = new Map<string, number[]>();
  for (const change of changes) {
    if (change.status !== 'approved' || !change.reviewed_at) continue;
    const approvedAt = Date.parse(change.reviewed_at);
    if (!Number.isFinite(approvedAt)) continue;
    const dates = approvals.get(change.vendor_id) || [];
    dates.push(approvedAt);
    approvals.set(change.vendor_id, dates);
  }
  return wires.flatMap(wire => {
    const reasons: string[] = [];
    if (wire.status === 'approved' && wire.risk_score !== null && wire.risk_score >= 70) {
      reasons.push(`High-risk wire approved (risk score ${wire.risk_score})`);
    }
    const createdAt = Date.parse(wire.created_at);
    if (wire.vendor_id && approvals.get(wire.vendor_id)?.some(approvedAt =>
      approvedAt <= createdAt && approvedAt >= createdAt - SEVEN_DAYS_MS
    )) {
      reasons.push('Vendor change approved within 7 days before this wire');
    }
    return reasons.length ? [{ ...wire, reasons }] : [];
  });
}

function csvCell(value: unknown): string {
  let text = String(value ?? '');
  // Prevent spreadsheet formula execution, including leading whitespace tricks.
  if (/^[\s]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function exceptionsToCsv(exceptions: ComplianceException[]): string {
  const rows = [
    ['Wire ID', 'Vendor', 'Amount', 'Currency', 'Date (UTC)', 'Exception reasons'],
    ...exceptions.map(wire => [
      wire.id, wire.vendor_name_snapshot || 'Unknown vendor', wire.amount,
      wire.currency || '', wire.created_at, wire.reasons.join('; '),
    ]),
  ];
  return '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
