-- V8 SECURITY AUDIT REMEDIATION
-- Fixes Privilege Escalation, State Machine Regression, WORM Logs, and adds DB Indexes.

-- 1. FIX PRIVILEGE ESCALATION: Lock down provision_invited_user natively
-- Clean up old 6-parameter version if it still exists
DROP FUNCTION IF EXISTS provision_invited_user(UUID, UUID, TEXT, TEXT, TEXT, UUID);

-- Lock down the 7-parameter version
REVOKE EXECUTE ON FUNCTION provision_invited_user(UUID, UUID, TEXT, TEXT, TEXT, UUID, DECIMAL) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION provision_invited_user(UUID, UUID, TEXT, TEXT, TEXT, UUID, DECIMAL) FROM authenticated;
GRANT EXECUTE ON FUNCTION provision_invited_user(UUID, UUID, TEXT, TEXT, TEXT, UUID, DECIMAL) TO service_role;

-- 2. STATE MACHINE REGRESSION: Restore strict transition logic from V5
CREATE OR REPLACE FUNCTION transition_wire_state(
  p_wire_id UUID,
  p_new_status TEXT,
  p_actor_id UUID,
  p_crypto_hash TEXT DEFAULT 'SYSTEM_GENERATED'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER 
AS $$
DECLARE
  v_wire wire_requests%ROWTYPE;
  v_valid_transition BOOLEAN := FALSE;
BEGIN
  -- Row locking
  SELECT * INTO v_wire FROM wire_requests WHERE id = p_wire_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Wire request not found'; END IF;

  -- Restore strict transition logic
  IF v_wire.status = 'pending' AND p_new_status IN ('approved', 'denied') THEN
    v_valid_transition := TRUE;
  ELSIF v_wire.status = 'frozen' AND p_new_status IN ('under_review', 'denied') THEN
    v_valid_transition := TRUE;
  ELSIF v_wire.status = 'under_review' AND p_new_status IN ('approved', 'denied') THEN
    v_valid_transition := TRUE;
  END IF;

  IF NOT v_valid_transition THEN
    RAISE EXCEPTION 'Invalid state transition from % to %', v_wire.status, p_new_status;
  END IF;

  IF p_new_status IN ('approved', 'denied') AND v_wire.clerk_id = p_actor_id THEN
    RAISE EXCEPTION 'SOD_VIOLATION: The creator of a wire request cannot alter or approve their own wire.';
  END IF;

  UPDATE wire_requests
  SET status = p_new_status,
      approved_at = CASE WHEN p_new_status IN ('approved', 'denied') THEN NOW() ELSE approved_at END,
      cfo_id = CASE WHEN p_new_status IN ('approved', 'denied') THEN p_actor_id ELSE cfo_id END,
      cryptographic_hash = CASE WHEN p_new_status = 'approved' THEN p_crypto_hash ELSE cryptographic_hash END
  WHERE id = p_wire_id
  RETURNING * INTO v_wire;

  INSERT INTO audit_logs (company_id, wire_id, actor_id, action, new_hash)
  VALUES (v_wire.company_id, p_wire_id, p_actor_id, 'STATE_CHANGED_TO_' || UPPER(p_new_status), p_crypto_hash);

  RETURN to_jsonb(v_wire);
END;
$$;

-- Ensure the RPC is locked down natively
REVOKE EXECUTE ON FUNCTION transition_wire_state(UUID, TEXT, UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION transition_wire_state(UUID, TEXT, UUID, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION transition_wire_state(UUID, TEXT, UUID, TEXT) TO service_role;

-- 3. WORM PROTECTION: Prevent DELETES and UPDATES on audit_logs
CREATE OR REPLACE FUNCTION prevent_audit_tampering() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'CRITICAL: Audit logs are immutable and cannot be altered or deleted.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_audit_update ON audit_logs;
CREATE TRIGGER trg_prevent_audit_update 
  BEFORE UPDATE OR DELETE ON audit_logs 
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_tampering();

-- 4. PHASE 3 SCALABILITY: Security-Critical Database Indexes
CREATE INDEX IF NOT EXISTS idx_wire_requests_company_id ON wire_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_wire_requests_status ON wire_requests(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_company_created ON audit_logs(company_id, created_at);
CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_user ON webauthn_challenges(user_id, context);
CREATE INDEX IF NOT EXISTS idx_user_authenticators_user ON user_authenticators(user_id);
