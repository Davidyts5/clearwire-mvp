-- STATE MACHINE UPGRADES (v3.0)
-- Enforces strict state transitions, atomic row locking, and prevents race conditions.

-- 1. Update the status constraint to include 'under_review'
ALTER TABLE wire_requests DROP CONSTRAINT IF EXISTS wire_requests_status_check;
ALTER TABLE wire_requests ADD CONSTRAINT wire_requests_status_check 
  CHECK (status IN ('pending', 'frozen', 'under_review', 'approved', 'denied'));

-- 2. Create the Atomic State Transition RPC Function
-- Uses SELECT FOR UPDATE to lock the row and prevent race conditions (e.g. double approvals)
CREATE OR REPLACE FUNCTION transition_wire_state(
  p_wire_id UUID,
  p_new_status TEXT,
  p_actor_id UUID,
  p_crypto_hash TEXT DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER -- Runs with the permissions of the calling user (respects RLS)
AS $$
DECLARE
  v_wire wire_requests%ROWTYPE;
  v_valid_transition BOOLEAN := FALSE;
BEGIN
  -- Lock the row exclusively for this transaction
  SELECT * INTO v_wire
  FROM wire_requests
  WHERE id = p_wire_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wire request not found or access denied by RLS';
  END IF;

  -- ENFORCE STRICT STATE MACHINE RULES
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

  -- Apply the transition securely
  UPDATE wire_requests
  SET status = p_new_status,
      approved_at = CASE WHEN p_new_status IN ('approved', 'denied') THEN NOW() ELSE approved_at END,
      cfo_id = CASE WHEN p_new_status IN ('approved', 'denied') THEN p_actor_id ELSE cfo_id END,
      cryptographic_hash = COALESCE(p_crypto_hash, cryptographic_hash)
  WHERE id = p_wire_id
  RETURNING * INTO v_wire;

  -- Automatically append the WORM Audit Log within the same transaction
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
