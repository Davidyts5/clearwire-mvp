import { getAdminClient } from './api-auth';

// PERSISTENT RATE LIMITER (Postgres-Backed)
// Replaces the old in-memory map which failed in serverless deployments.
export async function checkRateLimit(identifier: string, limit: number, windowMs: number): Promise<boolean> {
  const adminClient = await getAdminClient();
  const now = Date.now();
  
  // We use the admin client so we bypass RLS for system operations
  // We use an RPC call to handle the atomic UPSERT operation safely
  const { data, error } = await adminClient.rpc('enforce_rate_limit', {
    p_identifier: identifier,
    p_limit: limit,
    p_window_ms: windowMs,
    p_now: now
  });

  if (error) {
    // If the RPC isn't set up yet, fallback to a standard approach to avoid breaking the app immediately
    const { data: record, error: fetchErr } = await adminClient
      .from('rate_limits')
      .select('count, reset_time')
      .eq('identifier', identifier)
      .single();

    if (!record || now > record.reset_time) {
      // Upsert: Create or reset
      await adminClient.from('rate_limits').upsert({
        identifier,
        count: 1,
        reset_time: now + windowMs
      });
      return true;
    }

    if (record.count >= limit) return false;

    // Increment
    await adminClient.from('rate_limits')
      .update({ count: record.count + 1 })
      .eq('identifier', identifier);
      
    return true;
  }
  
  return data;
}
