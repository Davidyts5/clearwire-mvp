-- V10 MIGRATION: Fixes Missing Columns and Rejection Workflows

-- 1. ADD MISSING COLUMNS
-- These columns were omitted in previous sync scripts, causing data to drop silently.
ALTER TABLE wire_requests ADD COLUMN IF NOT EXISTS account_number_snapshot TEXT;
ALTER TABLE wire_requests ADD COLUMN IF NOT EXISTS swift_bic_snapshot TEXT;
ALTER TABLE wire_requests ADD COLUMN IF NOT EXISTS invoice_path TEXT;
ALTER TABLE wire_requests ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE wire_requests ADD COLUMN IF NOT EXISTS rejection_notes TEXT;

-- 2. REBUILD THE STATE MACHINE RPC
-- The previous V8 RPC ignored rejection reasons. This version captures them natively.
DROP FUNCTION IF EXISTS transition_wire_state(UUID, TEXT, UUID, TEXT);
DROP FUNCTION IF EXISTS transition_wire_state(UUID, TEXT, UUID, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION transition_wire_state(
  p_wire_id UUID,
  p_new_status TEXT,
  p_actor_id UUID,
  p_crypto_hash TEXT DEFAULT 'SYSTEM_GENERATED',
  p_rejection_reason TEXT DEFAULT NULL,
  p_rejection_notes TEXT DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER 
AS $$
DECLARE
  v_wire wire_requests%ROWTYPE;
  v_valid_transition BOOLEAN := FALSE;
BEGIN
  -- Row locking to prevent race conditions
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

  -- Enforce Segregation of Duties (SoD)
  IF p_new_status IN ('approved', 'denied') AND v_wire.clerk_id = p_actor_id THEN
    RAISE EXCEPTION 'SOD_VIOLATION: The creator of a wire request cannot alter or approve their own wire.';
  END IF;

  -- Execute atomic update, capturing rejection notes
  UPDATE wire_requests
  SET status = p_new_status,
      approved_at = CASE WHEN p_new_status IN ('approved', 'denied') THEN NOW() ELSE approved_at END,
      cfo_id = CASE WHEN p_new_status IN ('approved', 'denied') THEN p_actor_id ELSE cfo_id END,
      cryptographic_hash = CASE WHEN p_new_status = 'approved' THEN p_crypto_hash ELSE cryptographic_hash END,
      rejection_reason = p_rejection_reason,
      rejection_notes = p_rejection_notes
  WHERE id = p_wire_id
  RETURNING * INTO v_wire;

  -- Insert WORM Audit Log
  INSERT INTO audit_logs (company_id, wire_id, actor_id, action, new_hash)
  VALUES (v_wire.company_id, p_wire_id, p_actor_id, 'STATE_CHANGED_TO_' || UPPER(p_new_status), p_crypto_hash);

  RETURN to_jsonb(v_wire);
END;
$$;

-- Secure the RPC
REVOKE EXECUTE ON FUNCTION transition_wire_state(UUID, TEXT, UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION transition_wire_state(UUID, TEXT, UUID, TEXT, TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION transition_wire_state(UUID, TEXT, UUID, TEXT, TEXT, TEXT) TO service_role;
