import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { ROLES } from '@/lib/roles';

export const GET = withAuth([ROLES.AUDITOR, ROLES.CFO], async (req, ctx, auth) => {
  try {
    const supabase = auth.supabase;

    // Fetch core datasets concurrently
    const [auditRes, vendorHistRes, wiresRes, vendorsRes] = await Promise.all([
      supabase.from('audit_logs').select('*, users:actor_id(full_name, role)').eq('company_id', auth.companyId).order('created_at', { ascending: false }).limit(200),
      supabase.from('vendor_history').select('*, users:actor_id(full_name, role), vendors(name)').eq('company_id', auth.companyId).order('created_at', { ascending: false }).limit(200),
      supabase.from('wire_requests').select('*, vendors(name)').eq('company_id', auth.companyId).order('created_at', { ascending: false }),
      supabase.from('vendors').select('*').eq('company_id', auth.companyId)
    ]);

    const auditLogs = auditRes.data || [];
    const vendorHistory = vendorHistRes.data || [];
    const wires = wiresRes.data || [];
    const vendors = vendorsRes.data || [];

    // --- 1. Identify Active Investigations (Dynamic Option 1) ---
    // Frozen wires and Restricted vendors are treated as "Open Investigations"
    const frozenWires = wires.filter((w: any) => w.status === 'frozen');
    const restrictedVendors = vendors.filter((v: any) => v.status === 'restricted');
    
    const investigations = [
      ...frozenWires.map((w: any) => ({
        id: w.id,
        subjectId: w.id,
        type: 'WIRE',
        status: 'Open - Frozen',
        title: `Suspicious Wire to ${w.vendor_name_snapshot}`,
        riskScore: w.risk_score,
        riskReasons: JSON.parse(w.risk_reasons || '[]'),
        date: w.created_at,
        amount: w.amount
      })),
      ...restrictedVendors.map((v: any) => ({
        id: v.id,
        subjectId: v.id,
        type: 'VENDOR',
        status: 'Open - Restricted',
        title: `Restricted Vendor: ${v.name}`,
        riskScore: 100,
        riskReasons: ['Vendor manually restricted by Executive'],
        date: v.created_at,
        amount: null
      }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // --- 2. Build Unified Event Timeline ---
    let timeline: any[] = [];

    // Process WORM Audit Logs
    auditLogs.forEach((log: any) => {
      let category = 'SYSTEM';
      let severity = 'info';
      let title = log.action;
      
      if (log.action.includes('POLICY')) {
        category = 'POLICY';
        severity = 'warning';
        title = 'Security Policy Modified';
      } else if (log.action.includes('WIRE')) {
        category = 'WIRE';
        severity = log.action.includes('FROZEN') ? 'critical' : log.action.includes('DENIED') ? 'warning' : 'info';
      } else if (log.action.includes('VENDOR')) {
        category = 'VENDOR';
        severity = log.action.includes('RESTRICTED') ? 'critical' : 'warning';
      } else if (log.action === 'CREATED' && log.wire_id !== '00000000-0000-0000-0000-000000000000') {
        category = 'WIRE';
        title = 'Wire Drafted';
      }

      timeline.push({
        id: `audit-${log.id}`,
        timestamp: log.created_at,
        category,
        severity,
        title,
        message: log.action.includes('POLICY') ? `Policy changed to: ${log.new_hash} (Was: ${log.previous_hash})` : `Immutable audit hash generated.`,
        actorName: log.users?.full_name || 'System',
        actorRole: log.users?.role || 'SYSTEM',
        subjectId: log.wire_id,
        raw: log
      });
    });

    // Process Vendor History
    vendorHistory.forEach((vh: any) => {
      let severity = 'info';
      let title = vh.action;
      
      if (vh.action.includes('REJECTED')) severity = 'warning';
      if (vh.action.includes('RESTRICTED')) severity = 'critical';
      if (vh.action.includes('APPROVED')) severity = 'success';

      timeline.push({
        id: `vh-${vh.id}`,
        timestamp: vh.created_at,
        category: 'VENDOR',
        severity,
        title: title.replace(/_/g, ' '),
        message: vh.details?.reason ? `Reason: ${vh.details.reason}` : `Vendor modification event logged.`,
        actorName: vh.users?.full_name || 'System',
        actorRole: vh.users?.role || 'SYSTEM',
        subjectId: vh.vendor_id,
        raw: vh
      });
    });

    // Process Basic Wire Events (Creation context)
    wires.forEach((w: any) => {
      if (w.status === 'frozen') {
        timeline.push({
          id: `wire-freeze-${w.id}`,
          timestamp: w.created_at, // Approximate to creation if auto-frozen
          category: 'WIRE',
          severity: 'critical',
          title: 'Risk Engine Freeze',
          message: `Score: ${w.risk_score}/100. Reasons: ${JSON.parse(w.risk_reasons || '[]').join(', ')}`,
          actorName: 'ClearWire Risk Engine',
          actorRole: 'AI',
          subjectId: w.id,
          raw: w
        });
      }
    });

    // Sort complete timeline descending
    timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // --- 3. Compute Top Stats ---
    const stats = {
      totalInvestigations: investigations.length,
      restrictedVendors: restrictedVendors.length,
      frozenWires: frozenWires.length,
      policyChanges: auditLogs.filter((l: any) => l.action.includes('POLICY')).length
    };

    return NextResponse.json({ success: true, stats, investigations, timeline });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
