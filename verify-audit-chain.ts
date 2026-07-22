import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { computeAuditHash, computeGenesisHash } from './src/lib/audit-chain';

dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function verify() {
  const { data: companies } = await supabase.from('companies').select('id');
  if (!companies) return;

  for (const company of companies) {
    console.log(`\nVerifying chain for company: ${company.id}`);
    
    const { data: logs } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('company_id', company.id)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true });

    if (!logs || logs.length === 0) {
      console.log(`  No logs found.`);
      continue;
    }

    let expectedPrev = computeGenesisHash(company.id);
    let allValid = true;

    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];
      const isHistoricalPlaceholder = !log.event_payload && (log.new_hash === 'SYSTEM' || log.new_hash === 'INITIAL_STATE' || !log.new_hash.startsWith('0x') && log.new_hash.length < 64);

      if (log.previous_hash !== expectedPrev) {
        console.log(`  [FAIL] Row ${log.id} has invalid previous_hash. Expected ${expectedPrev}, got ${log.previous_hash}`);
        if (isHistoricalPlaceholder) {
          console.log(`    -> Note: This is an old historical row with a placeholder hash.`);
        } else {
          allValid = false;
        }
      }

      if (log.event_payload) {
        const computedNew = computeAuditHash(log.previous_hash, log.event_payload);
        if (computedNew !== log.new_hash) {
          console.log(`  [FAIL] Row ${log.id} hash mismatch. Computed ${computedNew}, stored ${log.new_hash}`);
          allValid = false;
        }
      } else {
        console.log(`  [WARN] Row ${log.id} has no event_payload (Historical row). New hash: ${log.new_hash}`);
      }

      expectedPrev = log.new_hash;
    }

    if (allValid) {
      console.log(`  [SUCCESS] Modern chain is intact!`);
    } else {
      console.log(`  [ERROR] Chain integrity broken for modern rows!`);
    }
  }
}

verify().catch(console.error);
