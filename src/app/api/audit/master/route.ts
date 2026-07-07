import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { ROLES } from '@/lib/roles';

export const GET = withAuth([ROLES.AUDITOR, ROLES.CFO], async (req, ctx, auth) => {
  try {
    const supabase = auth.supabase;

    const [auditRes, vendorHistRes, invRes] = await Promise.all([
      supabase.from('audit_logs').select('*, users:actor_id(full_name, role)').eq('company_id', auth.companyId).order('created_at', { ascending: false }).limit(200),
      supabase.from('vendor_history').select('*, users:actor_id(full_name, role), vendors(name)').eq('company_id', auth.companyId).order('created_at', { ascending: false }).limit(200),
      supabase.from('investigations').select('*, vendors(name), wire_requests(amount, vendor_name_snapshot, risk_reasons)').eq('company_id', auth.companyId).order('created_at', { ascending: false })
    ]);

    const investigations = (invRes.data || []).map((inv: any) => ({
      id: inv.id,
      case_number: inv.case_number,
      type: inv.wire_id ? 'WIRE FRAUD' : 'VENDOR ANOMALY',
      status: inv.status,
      title: inv.wire_id ? `Suspicious Wire to ${inv.wire_requests?.vendor_name_snapshot || 'Unknown'}` : `Restricted Vendor: ${inv.vendors?.name || 'Unknown'}`,
      riskScore: inv.risk_score,
      riskReasons: inv.wire_requests?.risk_reasons ? JSON.parse(inv.wire_requests.risk_reasons) : ['Vendor manually restricted by Executive'],
      date: inv.created_at,
    }));

    let timeline: any[] = [];

    (auditRes.data || []).forEach((log: any) => {
      let category = 'SYSTEM', severity = 'info', title = log.action;
      if (log.action.includes('POLICY')) { category = 'POLICY'; severity = 'warning'; title = 'Security Policy Modified'; }
      else if (log.action.includes('WIRE')) { category = 'WIRE'; severity = log.action.includes('FROZEN') ? 'critical' : log.action.includes('DENIED') ? 'warning' : 'info'; }
      else if (log.action.includes('VENDOR')) { category = 'VENDOR'; severity = log.action.includes('RESTRICTED') ? 'critical' : 'warning'; }
      else if (log.action === 'CREATED' && log.wire_id !== '00000000-0000-0000-0000-000000000000') { category = 'WIRE'; title = 'Wire Drafted'; }
      timeline.push({ id: `audit-${log.id}`, timestamp: log.created_at, category, severity, title, message: log.action.includes('POLICY') ? `Policy changed to: ${log.new_hash} (Was: ${log.previous_hash})` : `Immutable audit hash generated.`, actorName: log.users?.full_name || 'System', actorRole: log.users?.role || 'SYSTEM', subjectId: log.wire_id });
    });

    (vendorHistRes.data || []).forEach((vh: any) => {
      let severity = 'info', title = vh.action;
      if (vh.action.includes('REJECTED')) severity = 'warning';
      if (vh.action.includes('RESTRICTED')) severity = 'critical';
      if (vh.action.includes('APPROVED')) severity = 'success';
      timeline.push({ id: `vh-${vh.id}`, timestamp: vh.created_at, category: 'VENDOR', severity, title: title.replace(/_/g, ' '), message: vh.details?.reason ? `Reason: ${vh.details.reason}` : `Vendor modification event logged.`, actorName: vh.users?.full_name || 'System', actorRole: vh.users?.role || 'SYSTEM', subjectId: vh.vendor_id });
    });

    timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const stats = {
      totalInvestigations: investigations.length,
      openInvestigations: investigations.filter((i:any) => i.status !== 'resolved').length,
      policyChanges: (auditRes.data || []).filter((l: any) => l.action.includes('POLICY')).length
    };

    return NextResponse.json({ success: true, stats, investigations, timeline });
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }); }
});
