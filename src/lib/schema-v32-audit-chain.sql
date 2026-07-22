-- V32 MIGRATION: Cryptographic Hash Chain & Audit Log Integrity

-- 1. Add event_payload to audit_logs to store the data that was hashed
ALTER TABLE audit_logs ADD COLUMN event_payload JSONB;
ALTER TABLE audit_logs
    ADD CONSTRAINT audit_logs_company_prevhash_uniq UNIQUE (company_id, previous_hash);

-- 2. Create an RPC to append audit logs with Optimistic Concurrency Control (OCC)
-- This fetches the latest hash inside a locked transaction to prevent race conditions.
CREATE OR REPLACE FUNCTION insert_audit_log_occ(
    p_company_id UUID,
    p_wire_id UUID,
    p_actor_id UUID,
    p_action TEXT,
    p_ip_address TEXT,
    p_event_payload JSONB,
    p_expected_prev_hash TEXT,
    p_new_hash TEXT,
    p_genesis_hash TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_actual_prev TEXT;
    v_count INT;
BEGIN
    -- Lock the rows for this company to prevent concurrent inserts
    SELECT count(*) INTO v_count FROM audit_logs WHERE company_id = p_company_id;
    
    IF v_count = 0 THEN
        v_actual_prev := p_genesis_hash;
    ELSE
        SELECT new_hash INTO v_actual_prev 
        FROM audit_logs 
        WHERE company_id = p_company_id 
        ORDER BY created_at DESC, id DESC 
        LIMIT 1 
        FOR UPDATE;
    END IF;

    -- Check if the previous hash matches our expected hash from the client
    IF v_actual_prev != p_expected_prev_hash THEN
        -- Concurrency collision: another request inserted a log first.
        -- We return false so the client can recompute and retry.
        RETURN FALSE;
    END IF;

    -- All good, insert the chain link
    BEGIN
        INSERT INTO audit_logs (company_id, wire_id, actor_id, action, ip_address, previous_hash, new_hash, event_payload)
        VALUES (p_company_id, p_wire_id, p_actor_id, p_action, p_ip_address, p_expected_prev_hash, p_new_hash, p_event_payload);
        RETURN TRUE;
    EXCEPTION WHEN unique_violation THEN
        RETURN FALSE;
    END;
END;
$$;
