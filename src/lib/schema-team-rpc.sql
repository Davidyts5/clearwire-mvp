-- SECURE USER PROVISIONING BYPASS
-- This Stored Procedure securely allows a new user to be inserted into the users table
-- during the invite flow, bypassing the RLS policies that would normally block them.

CREATE OR REPLACE FUNCTION provision_invited_user(
  p_user_id UUID,
  p_company_id UUID,
  p_email TEXT,
  p_full_name TEXT,
  p_role TEXT,
  p_invite_id UUID,
  p_approval_limit DECIMAL DEFAULT 0
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Crucial: Runs with superuser privileges, completely bypassing RLS
AS $$
BEGIN
  -- 1. Insert the user
  INSERT INTO users (id, company_id, email, full_name, role, approval_limit)
  VALUES (p_user_id, p_company_id, p_email, p_full_name, p_role, p_approval_limit);

  -- 2. Mark the invite as accepted so it cannot be reused
  UPDATE team_invites 
  SET status = 'accepted' 
  WHERE id = p_invite_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to provision user: %', SQLERRM;
END;
$$;

-- FIX: EXPLICIT PRIVILEGE REVOCATION (Self-Contained Security)
-- This guarantees that the function cannot be executed by unauthorized public users
-- or logged-in users attempting privilege escalation, regardless of migration execution order.
REVOKE EXECUTE ON FUNCTION provision_invited_user(UUID, UUID, TEXT, TEXT, TEXT, UUID, DECIMAL) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION provision_invited_user(UUID, UUID, TEXT, TEXT, TEXT, UUID, DECIMAL) FROM authenticated;
GRANT EXECUTE ON FUNCTION provision_invited_user(UUID, UUID, TEXT, TEXT, TEXT, UUID, DECIMAL) TO service_role;
