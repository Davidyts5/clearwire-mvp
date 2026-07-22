-- V33 MIGRATION: Remove direct audit log insert from transition_wire_state
-- This delegates the WORM logging to the TS helper for proper cryptographic chaining.

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
      v_final_status := 'pending_cfo';
    ELSIF p_requires_second_approval AND array_length(v_wire.approved_by_list, 1) IS NULL THEN
      v_final_status := 'pending_second_approval';
    END IF;
  END IF;

  -- Verify transition logic
  IF v_wire.status IN ('pending', 'pending_second_approval', 'pending_cfo') AND p_new_status IN ('approved', 'denied') THEN
    v_valid_transition := TRUE;
  ELSIF v_wire.status = 'frozen' AND p_new_status IN ('under_review', 'denied') THEN
    v_valid_transition := TRUE;
  ELSIF v_wire.status = 'under_review' AND p_new_status IN ('approved', 'denied') THEN
    v_valid_transition := TRUE;
  END IF;

  IF NOT v_valid_transition THEN
    RAISE EXCEPTION 'Invalid state transition from % to %', v_wire.status, p_new_status;
  END IF;

  UPDATE wire_requests
  SET status = v_final_status,
      approved_at = CASE WHEN v_final_status IN ('approved', 'denied') THEN NOW() ELSE approved_at END,
      cfo_id = CASE WHEN v_final_status IN ('approved', 'denied') THEN p_actor_id ELSE cfo_id END,
      cryptographic_hash = COALESCE(p_crypto_hash, cryptographic_hash),
      rejection_reason = COALESCE(p_rejection_reason, rejection_reason),
      rejection_notes = COALESCE(p_rejection_notes, rejection_notes),
      approved_by_list = array_append(v_wire.approved_by_list, p_actor_id)
  WHERE id = p_wire_id
  RETURNING * INTO v_wire;

  -- The audit_logs INSERT has been removed. It is now handled centrally by the TypeScript 
  -- appendAuditLog helper, which ensures strict SHA-256 chaining.

  RETURN to_jsonb(v_wire);
END;
$$;
