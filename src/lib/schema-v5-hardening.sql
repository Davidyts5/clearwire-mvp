-- V5 SECURITY HARDENING & REMEDIATION
-- Resolves Critical Privilege Escalation, SoD Bypass, and WORM Audit weaknesses.

-- 1. FIX RPC PRIVILEGE ESCALATION (CRITICAL)
-- Revoke public execution of SECURITY DEFINER functions to prevent unauthorized account provisioning
REVOKE EXECUTE ON FUNCTION provision_invited_user(UUID, UUID, TEXT, TEXT, TEXT, UUID, DECIMAL) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION provision_invited_user(UUID, UUID, TEXT, TEXT, TEXT, UUID, DECIMAL) FROM authenticated;
GRANT EXECUTE ON FUNCTION provision_invited_user(UUID, UUID, TEXT, TEXT, TEXT, UUID, DECIMAL) TO service_role;

-- 2. SECURE STATE TRANSITION RPC
-- Re-create the state transition function locked exclusively to the service_role
CREATE OR REPLACE FUNCTION transition_wire_state(
  p_wire_id UUID,
  p_new_status TEXT,
  p_actor_id UUID,
  p_crypto_hash TEXT DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER -- Runs as superuser to bypass RLS for this specific atomic transaction
AS $$
DECLARE
  v_wire wire_requests%ROWTYPE;
BEGIN
  -- Row locking to prevent approval race conditions
  SELECT * INTO v_wire FROM wire_requests WHERE id = p_wire_id FOR UPDATE;
  
  IF NOT FOUND THEN 
    RAISE EXCEPTION 'Wire request not found'; 
  END IF;

  -- ENFORCE SEGREGATION OF DUTIES (SoD)
  IF v_wire.clerk_id = p_actor_id THEN
    RAISE EXCEPTION 'SOD_VIOLATION: The creator of a wire request cannot alter or approve their own wire.';
  END IF;

  -- ENFORCE STRICT STATE MACHINE
  IF v_wire.status = 'pending' AND p_new_status IN ('approved', 'denied') THEN
    -- Valid
  ELSIF v_wire.status = 'frozen' AND p_new_status IN ('under_review', 'denied') THEN
    -- Valid
  ELSIF v_wire.status = 'under_review' AND p_new_status IN ('approved', 'denied') THEN
    -- Valid
  ELSE
    RAISE EXCEPTION 'Invalid state transition from % to %', v_wire.status, p_new_status;
  END IF;

  -- Apply the transition
  UPDATE wire_requests
  SET status = p_new_status,
      approved_at = CASE WHEN p_new_status IN ('approved', 'denied') THEN NOW() ELSE approved_at END,
      cfo_id = CASE WHEN p_new_status IN ('approved', 'denied') THEN p_actor_id ELSE cfo_id END,
      cryptographic_hash = COALESCE(p_crypto_hash, cryptographic_hash)
  WHERE id = p_wire_id
  RETURNING * INTO v_wire;

  -- Append the WORM Audit Log atomically
  INSERT INTO audit_logs (company_id, wire_id, actor_id, action, new_hash)
  VALUES (
    v_wire.company_id, 
    p_wire_id, 
    p_actor_id, 
    'STATE_CHANGED_TO_' || UPPER(p_new_status), 
    COALESCE(p_crypto_hash, 'SYSTEM_GENERATED')
  );

  RETURN to_jsonb(v_wire);
END;
$$;

REVOKE EXECUTE ON FUNCTION transition_wire_state(UUID, TEXT, UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION transition_wire_state(UUID, TEXT, UUID, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION transition_wire_state(UUID, TEXT, UUID, TEXT) TO service_role;

-- 3. SEGREGATION OF DUTIES TRIGGER (DEFENSE-IN-DEPTH)
-- Enforces SoD natively at the Postgres level in case the API is bypassed
CREATE OR REPLACE FUNCTION enforce_sod_trigger() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('approved', 'denied') AND NEW.cfo_id IS NOT NULL THEN
    IF NEW.clerk_id = NEW.cfo_id THEN
      RAISE EXCEPTION 'SOD_VIOLATION: The creator of a wire request cannot be its approver.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_sod ON wire_requests;
CREATE TRIGGER trg_enforce_sod 
  BEFORE UPDATE ON wire_requests 
  FOR EACH ROW EXECUTE FUNCTION enforce_sod_trigger();
