import os

# 1. Modify src/lib/schema-v32-audit-chain.sql
path1 = 'src/lib/schema-v32-audit-chain.sql'
with open(path1, 'r') as f:
    content1 = f.read()

content1 = content1.replace(
    'ALTER TABLE audit_logs ADD COLUMN event_payload JSONB;',
    'ALTER TABLE audit_logs ADD COLUMN event_payload JSONB;\nALTER TABLE audit_logs\n    ADD CONSTRAINT audit_logs_company_prevhash_uniq UNIQUE (company_id, previous_hash);'
)

old_insert_block = """    -- All good, insert the chain link
    INSERT INTO audit_logs (company_id, wire_id, actor_id, action, ip_address, previous_hash, new_hash, event_payload)
    VALUES (p_company_id, p_wire_id, p_actor_id, p_action, p_ip_address, p_expected_prev_hash, p_new_hash, p_event_payload);

    RETURN TRUE;"""

new_insert_block = """    -- All good, insert the chain link
    BEGIN
        INSERT INTO audit_logs (company_id, wire_id, actor_id, action, ip_address, previous_hash, new_hash, event_payload)
        VALUES (p_company_id, p_wire_id, p_actor_id, p_action, p_ip_address, p_expected_prev_hash, p_new_hash, p_event_payload);
        RETURN TRUE;
    EXCEPTION WHEN unique_violation THEN
        RETURN FALSE;
    END;"""

content1 = content1.replace(old_insert_block, new_insert_block)

with open(path1, 'w') as f:
    f.write(content1)


# 2. Modify src/lib/audit-chain.ts
path2 = 'src/lib/audit-chain.ts'
with open(path2, 'r') as f:
    content2 = f.read()

old_fallback = """    if (error) {
      console.error("Audit Log RPC Error:", error);
      // Fallback if RPC doesn't exist yet (during migrations)
      // This is less secure against races but ensures the app doesn't break entirely before DB migrations run.
      const fallbackHash = computeAuditHash(prevHash, params.eventPayload);
      const { error: insertErr } = await supabase.from('audit_logs').insert([{
        company_id: params.companyId,
        wire_id: params.wireId,
        actor_id: params.actorId,
        action: params.action,
        ip_address: params.ipAddress || null,
        previous_hash: prevHash,
        new_hash: fallbackHash,
        event_payload: params.eventPayload
      }]);
      if (insertErr) throw insertErr;
      return fallbackHash;
    }"""

new_fallback = """    if (error) {
      throw new Error(`Audit log RPC failed: ${error.message}`);
    }"""

content2 = content2.replace(old_fallback, new_fallback)

with open(path2, 'w') as f:
    f.write(content2)


# 3. Modify src/app/api/audit/timeline/[wireId]/verify/route.ts
path3 = 'src/app/api/audit/timeline/[wireId]/verify/route.ts'
with open(path3, 'r') as f:
    content3 = f.read()

old_verify = "const isHistoricalPlaceholder = !log.event_payload && (log.new_hash === 'SYSTEM' || log.new_hash === 'INITIAL_STATE' || (!log.new_hash.startsWith('0x') && log.new_hash.length < 64));"
new_verify = """const isHistoricalPlaceholder = !log.event_payload && (
        !log.new_hash ||
        log.new_hash === 'SYSTEM' ||
        log.new_hash === 'INITIAL_STATE' ||
        (!log.new_hash.startsWith('0x') && log.new_hash.length < 64)
      );"""

content3 = content3.replace(old_verify, new_verify)

with open(path3, 'w') as f:
    f.write(content3)

print("Modifications done.")
