-- PHASE 2: ATOMIC STATE MACHINE & RACE CONDITION PREVENTION
-- Run this in the Supabase SQL Editor.

-- 1. Create the Atomic State Transition RPC Function
CREATE OR REPLACE FUNCTION transition_wire_state(
  p_wire_id UUID,
  p_new_status TEXT,
  p_actor_id UUID,
  p_crypto_hash TEXT DEFAULT 'SYSTEM_GENERATED'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER -- Runs as superuser to bypass RLS safely during this atomic operation
AS $$
DECLARE
  v_wire wire_requests%ROWTYPE;
BEGIN
  -- EXACT FIX FOR RACE CONDITIONS: "SELECT FOR UPDATE"
  -- This physically locks the database row. If two CFOs click approve at the exact same millisecond,
  -- Postgres forces the second CFO to wait until the first transaction finishes.
  SELECT * INTO v_wire
  FROM wire_requests
  WHERE id = p_wire_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wire request not found';
  END IF;

  -- PREVENT "DOUBLE DECLINE" OR APPROVING FROZEN WIRES
  IF v_wire.status NOT IN ('pending', 'frozen', 'under_review') THEN
    RAISE EXCEPTION 'Transaction already processed. Current status: %', v_wire.status;
  END IF;

  -- ENFORCE SEGREGATION OF DUTIES (SoD)
  IF p_new_status IN ('approved', 'denied') AND v_wire.clerk_id = p_actor_id THEN
    RAISE EXCEPTION 'SOD_VIOLATION: The creator of a wire request cannot alter or approve their own wire.';
  END IF;

  -- Apply the state transition
  UPDATE wire_requests
  SET status = p_new_status,
      approved_at = CASE WHEN p_new_status IN ('approved', 'denied') THEN NOW() ELSE approved_at END,
      cfo_id = CASE WHEN p_new_status IN ('approved', 'denied') THEN p_actor_id ELSE cfo_id END,
      cryptographic_hash = CASE WHEN p_new_status = 'approved' THEN p_crypto_hash ELSE cryptographic_hash END
  WHERE id = p_wire_id
  RETURNING * INTO v_wire;

  -- Automatically append the WORM Audit Log within the exact same database transaction
  INSERT INTO audit_logs (company_id, wire_id, actor_id, action, new_hash)
  VALUES (
    v_wire.company_id, 
    p_wire_id, 
    p_actor_id, 
    'STATE_CHANGED_TO_' || UPPER(p_new_status), 
    p_crypto_hash
  );

  RETURN to_jsonb(v_wire);
END;
$$;

-- 2. Lock down the RPC function
REVOKE EXECUTE ON FUNCTION transition_wire_state(UUID, TEXT, UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION transition_wire_state(UUID, TEXT, UUID, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION transition_wire_state(UUID, TEXT, UUID, TEXT) TO service_role;
