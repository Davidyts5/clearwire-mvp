export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { ROLES } from '@/lib/roles';

export const GET = withAuth([ROLES.AUDITOR, ROLES.CFO], async (req, { params }, auth) => {
  try {
    const { searchParams } = new URL(req.url);
    // Optional date range
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Fetch all wires in company to get their creation time and risk context
    let wQuery = auth.supabase
      .from('wire_requests')
      .select('id, created_at, risk_score, status')
      .eq('company_id', auth.companyId);

    if (startDate) wQuery = wQuery.gte('created_at', startDate);
    if (endDate) wQuery = wQuery.lte('created_at', endDate);

    const { data: wires, error: wError } = await wQuery;
    if (wError) throw wError;

    const wireMap = new Map(wires.map(w => [w.id, w]));

    // Fetch approval/denial audit logs
    let lQuery = auth.supabase
      .from('audit_logs')
      .select('actor_id, action, created_at, wire_id, actor:actor_id(full_name, role)')
      .eq('company_id', auth.companyId)
      .in('action', ['STATE_CHANGED_TO_APPROVED', 'STATE_CHANGED_TO_DENIED']);

    if (startDate) lQuery = lQuery.gte('created_at', startDate);
    if (endDate) lQuery = lQuery.lte('created_at', endDate);

    const { data: logs, error: lError } = await lQuery;
    if (lError) throw lError;

    const approverStats: Record<string, {
      actor_id: string;
      full_name: string;
      role: string;
      routine_approvals: number;
      routine_time_ms: number;
      frozen_approvals: number;
      frozen_time_ms: number;
      total_actions: number;
      denies: number;
    }> = {};

    logs.forEach(log => {
      const wire = wireMap.get(log.wire_id);
      if (!wire) return; // Might be outside date range

      if (!approverStats[log.actor_id]) {
        approverStats[log.actor_id] = {
          actor_id: log.actor_id,
          full_name: log.actor?.full_name || 'Unknown',
          role: log.actor?.role || 'Unknown',
          routine_approvals: 0,
          routine_time_ms: 0,
          frozen_approvals: 0,
          frozen_time_ms: 0,
          total_actions: 0,
          denies: 0
        };
      }

      const stat = approverStats[log.actor_id];
      stat.total_actions += 1;

      if (log.action === 'STATE_CHANGED_TO_DENIED') {
        stat.denies += 1;
      }

      // Calculate time delta
      const timeMs = new Date(log.created_at).getTime() - new Date(wire.created_at).getTime();
      
      // If it's an approval action (either approved or denied) we measure the response time.
      // A wire with high risk_score initially is considered "Frozen/High-Risk Context"
      // Note: we consider risk_score >= 70 as high risk context since dynamic thresholds exist.
      // But we can also just use whether the wire was frozen initially. We don't have initial status easily, 
      // but risk_score >= 70 is a good proxy for "High Risk".
      const isHighRisk = wire.risk_score >= 70;

      if (isHighRisk) {
        stat.frozen_approvals += 1;
        stat.frozen_time_ms += timeMs;
      } else {
        stat.routine_approvals += 1;
        stat.routine_time_ms += timeMs;
      }
    });

    const result = Object.values(approverStats).map(s => {
      const avgRoutine = s.routine_approvals > 0 ? s.routine_time_ms / s.routine_approvals : null;
      const avgFrozen = s.frozen_approvals > 0 ? s.frozen_time_ms / s.frozen_approvals : null;
      
      const ratio = s.total_actions >= 10 ? (s.total_actions - s.denies) / s.total_actions : null;

      return {
        actor_id: s.actor_id,
        full_name: s.full_name,
        role: s.role,
        total_actions: s.total_actions,
        avg_time_routine_ms: avgRoutine,
        avg_time_frozen_ms: avgFrozen,
        approve_ratio: ratio // Suppressed if < 10
      };
    });

    result.sort((a, b) => b.total_actions - a.total_actions);

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
