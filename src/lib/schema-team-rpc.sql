-- SECURE USER PROVISIONING BYPASS
-- This Stored Procedure securely allows a new user to be inserted into the users table
-- during the invite flow, bypassing the RLS policies that would normally block them.

-- 1. DROP old signatures to prevent overload conflicts
DROP FUNCTION IF EXISTS provision_invited_user(UUID, UUID, TEXT, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS provision_invited_user(UUID, UUID, TEXT, TEXT, TEXT, UUID, DECIMAL);
DROP FUNCTION IF EXISTS provision_invited_user(UUID, UUID, TEXT, TEXT, TEXT, UUID, DECIMAL, BOOLEAN);

-- 2. CREATE THE SECURE 8-PARAMETER ENTERPRISE FUNCTION
CREATE OR REPLACE FUNCTION provision_invited_user(
  p_user_id UUID,
  p_company_id UUID,
  p_email TEXT,
  p_full_name TEXT,
  p_role TEXT,
  p_invite_id UUID,
  p_approval_limit DECIMAL DEFAULT 0,
  p_can_unfreeze BOOLEAN DEFAULT false
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Crucial: Runs with superuser privileges, completely bypassing RLS
AS $$
BEGIN
  -- Insert the user
  INSERT INTO users (id, company_id, email, full_name, role, approval_limit, can_unfreeze)
  VALUES (p_user_id, p_company_id, p_email, p_full_name, p_role, p_approval_limit, p_can_unfreeze);

  -- Mark the invite as accepted so it cannot be reused
  UPDATE team_invites 
  SET status = 'accepted' 
  WHERE id = p_invite_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to provision user: %', SQLERRM;
END;
$$;

-- 3. EXPLICIT PRIVILEGE REVOCATION (Self-Contained Security)
REVOKE EXECUTE ON FUNCTION provision_invited_user(UUID, UUID, TEXT, TEXT, TEXT, UUID, DECIMAL, BOOLEAN) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION provision_invited_user(UUID, UUID, TEXT, TEXT, TEXT, UUID, DECIMAL, BOOLEAN) FROM authenticated;
GRANT EXECUTE ON FUNCTION provision_invited_user(UUID, UUID, TEXT, TEXT, TEXT, UUID, DECIMAL, BOOLEAN) TO service_role;
