export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { ROLES } from '@/lib/roles';
import { getVisibleWireIds } from '@/lib/inbound-quarantine';

function csvEscape(val: any): string {
  const str = String(val ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export const GET = withAuth([ROLES.AUDITOR, ROLES.CFO], async (req, ctx, auth) => {
  let visibleWireIds: Set<string> | null = null;
  if (auth.role === ROLES.CFO) {
    try {
      visibleWireIds = await getVisibleWireIds(auth.supabase, auth.companyId, new Date().toISOString());
    } catch {
      return NextResponse.json({ error: 'Unable to verify quarantine visibility' }, { status: 503 });
    }
  }

  const { data: logs, error } = await auth.supabase
    .from('audit_logs')
    .select('*, users:actor_id(full_name, role)')
    .eq('company_id', auth.companyId)
    .order('created_at', { ascending: false })
    .limit(2000);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const header = ['Timestamp', 'Action', 'Actor Name', 'Actor Role', 'Wire ID', 'Details'].join(',');
  const visibleLogs = (logs || []).filter((log: any) =>
    !visibleWireIds || !log.wire_id || visibleWireIds.has(log.wire_id)
  );
  const rows = visibleLogs.map((log: any) => [
    csvEscape(new Date(log.created_at).toISOString()),
    csvEscape(log.action),
    csvEscape(log.users?.full_name || 'System'),
    csvEscape(log.users?.role || 'SYSTEM'),
    csvEscape(log.wire_id),
    csvEscape(log.new_hash),
  ].join(','));

  const csv = [header, ...rows].join('\n');

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="clearwire-audit-log-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  });
});
