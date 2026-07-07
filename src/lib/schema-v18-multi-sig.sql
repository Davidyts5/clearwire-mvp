-- V18 MIGRATION: Multi-Signature Dual Control
ALTER TABLE wire_requests ADD COLUMN IF NOT EXISTS approved_by_list UUID[] DEFAULT '{}'::UUID[];

-- We drop the old atomic state machine RPC and build the new Multi-Sig version
DROP FUNCTION IF EXISTS transition_wire_state(UUID, TEXT, UUID, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION transition_wire_state(
  p_wire_id UUID,
  p_new_status TEXT,
  p_actor_id UUID,
  p_crypto_hash TEXT DEFAULT 'SYSTEM_GENERATED',
  p_rejection_reason TEXT DEFAULT NULL,
  p_rejection_notes TEXT DEFAULT NULL,
  p_requires_second_approval BOOLEAN DEFAULT FALSE,
  p_requires_cfo_approval BOOLEAN DEFAULT FALSE
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER 
AS $$
DECLARE
  v_wire wire_requests%ROWTYPE;
  v_valid_transition BOOLEAN := FALSE;
  v_final_status TEXT;
BEGIN
  -- Row locking to prevent race conditions
  SELECT * INTO v_wire FROM wire_requests WHERE id = p_wire_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Wire request not found'; END IF;

  -- Block users from signing the exact same wire twice
  IF p_actor_id = ANY(v_wire.approved_by_list) THEN
    RAISE EXCEPTION 'DUPLICATE_SIGNER: You have already provided a cryptographic signature for this transaction.';
  END IF;

  -- Enforce Segregation of Duties (SoD)
  IF p_new_status IN ('approved', 'denied') AND v_wire.clerk_id = p_actor_id THEN
    RAISE EXCEPTION 'SOD_VIOLATION: The creator of a wire request cannot alter or approve their own wire.';
  END IF;

  -- Determine the actual destination state based on the multi-sig requirements
  v_final_status := p_new_status;
  
  IF p_new_status = 'approved' THEN
    IF p_requires_cfo_approval THEN
      -- A controller signed it, but it's too big, so it routes to the CFO queue
      v_final_status := 'pending_cfo';
    ELSIF p_requires_second_approval AND array_length(v_wire.approved_by_list, 1) IS NULL THEN
      -- It needs two controllers, and this is the very first controller to sign it
      v_final_status := 'pending_second_approval';
    END IF;
  END IF;

  -- Execute atomic update
  UPDATE wire_requests
  SET status = v_final_status,
      approved_at = CASE WHEN v_final_status IN ('approved', 'denied') THEN NOW() ELSE approved_at END,
      cfo_id = CASE WHEN v_final_status IN ('approved', 'denied') THEN p_actor_id ELSE cfo_id END,
      cryptographic_hash = CASE WHEN v_final_status = 'approved' THEN p_crypto_hash ELSE cryptographic_hash END,
      rejection_reason = p_rejection_reason,
      rejection_notes = p_rejection_notes,
      approved_by_list = array_append(approved_by_list, p_actor_id)
  WHERE id = p_wire_id
  RETURNING * INTO v_wire;

  -- Insert WORM Audit Log
  INSERT INTO audit_logs (company_id, wire_id, actor_id, action, new_hash)
  VALUES (v_wire.company_id, p_wire_id, p_actor_id, 'STATE_CHANGED_TO_' || UPPER(v_final_status), p_crypto_hash);

  RETURN to_jsonb(v_wire);
END;
$$;

REVOKE EXECUTE ON FUNCTION transition_wire_state(UUID, TEXT, UUID, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION transition_wire_state(UUID, TEXT, UUID, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN) FROM authenticated;
GRANT EXECUTE ON FUNCTION transition_wire_state(UUID, TEXT, UUID, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN) TO service_role;
