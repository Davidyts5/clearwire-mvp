import crypto from 'crypto';
import { SupabaseClient } from '@supabase/supabase-js';

export function canonicalJSON(obj: any): string {
  if (obj === null || obj === undefined) return 'null';
  if (typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalJSON).join(',') + ']';
  }
  const keys = Object.keys(obj).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + canonicalJSON(obj[k])).join(',') + '}';
}

export function computeGenesisHash(companyId: string): string {
  return crypto.createHash('sha256').update('GENESIS:' + companyId).digest('hex');
}

export function computeAuditHash(previousHash: string, eventPayload: any): string {
  const payloadStr = canonicalJSON(eventPayload);
  return crypto.createHash('sha256').update(previousHash + payloadStr).digest('hex');
}

export async function appendAuditLog(
  supabase: SupabaseClient,
  params: {
    companyId: string;
    wireId: string | null;
    actorId: string;
    action: string;
    ipAddress?: string | null;
    eventPayload: any;
  }
): Promise<string> {
  let attempts = 0;
  while (attempts < 5) {
    attempts++;
    
    // 1. Get previous hash
    const { data: lastLog } = await supabase
      .from('audit_logs')
      .select('new_hash')
      .eq('company_id', params.companyId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(1);

    const prevHash = (lastLog && lastLog.length > 0) 
      ? lastLog[0].new_hash 
      : computeGenesisHash(params.companyId);

    // 2. Compute new hash
    const newHash = computeAuditHash(prevHash, params.eventPayload);

    // 3. Try to insert via RPC to avoid race conditions
    const { data, error } = await supabase.rpc('insert_audit_log_occ', {
      p_company_id: params.companyId,
      p_wire_id: params.wireId,
      p_actor_id: params.actorId,
      p_action: params.action,
      p_ip_address: params.ipAddress || null,
      p_event_payload: params.eventPayload,
      p_expected_prev_hash: prevHash,
      p_new_hash: newHash,
      p_genesis_hash: computeGenesisHash(params.companyId)
    });

    if (error) {
      throw new Error(`Audit log RPC failed: ${error.message}`);
    }

    if (data === true) {
      return newHash;
    }

    // If data === false, it means concurrency collision. Sleep and retry.
    await new Promise(res => setTimeout(res, 50 * attempts));
  }
  throw new Error("Failed to append audit log after multiple concurrent attempts");
}

export async function verifyCompanyChain(
  supabase: SupabaseClient,
  companyId: string,
  periodStart?: string,
  periodEnd?: string
): Promise<{
  totalRecords: number;
  validCount: number;
  invalidIds: string[];
  historicalPlaceholderCount: number;
  recordResults: Record<string, boolean>;
}> {
  let expectedPrev = computeGenesisHash(companyId);
  let offset = 0;
  const limit = 1000;

  let totalRecords = 0;
  let validCount = 0;
  const invalidIds: string[] = [];
  let historicalPlaceholderCount = 0;
  const recordResults: Record<string, boolean> = {};

  const start = periodStart ? new Date(periodStart).getTime() : null;
  const end = periodEnd ? new Date(periodEnd).getTime() : null;

  while (true) {
    const { data: logs, error } = await supabase
      .from('audit_logs')
      .select('id, previous_hash, new_hash, event_payload, created_at')
      .eq('company_id', companyId)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    if (!logs || logs.length === 0) break;

    for (const log of logs) {
      let valid = true;
      const isHistoricalPlaceholder = !log.event_payload;

      if (log.previous_hash !== expectedPrev) {
        if (!isHistoricalPlaceholder) valid = false;
      }

      if (log.event_payload) {
        const computedNew = computeAuditHash(log.previous_hash, log.event_payload);
        if (computedNew !== log.new_hash) {
          valid = false;
        }
      }

      recordResults[log.id] = valid;
      expectedPrev = log.new_hash;

      const logTime = new Date(log.created_at).getTime();
      const inPeriod = (!start || logTime >= start) && (!end || logTime <= end);

      if (inPeriod) {
        totalRecords++;
        if (valid) validCount++;
        else invalidIds.push(log.id);

        if (isHistoricalPlaceholder) historicalPlaceholderCount++;
      }
    }

    if (logs.length < limit) break;
    offset += limit;
  }

  return { totalRecords, validCount, invalidIds, historicalPlaceholderCount, recordResults };
}
