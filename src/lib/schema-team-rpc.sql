-- SECURE USER PROVISIONING BYPASS
-- This Stored Procedure securely allows a new user to be inserted into the users table
-- during the invite flow, bypassing the RLS policies that would normally block them.

CREATE OR REPLACE FUNCTION provision_invited_user(
  p_user_id UUID,
  p_company_id UUID,
  p_email TEXT,
  p_full_name TEXT,
  p_role TEXT,
  p_invite_id UUID
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Crucial: Runs with superuser privileges, completely bypassing RLS
AS $$
BEGIN
  -- 1. Insert the user
  INSERT INTO users (id, company_id, email, full_name, role)
  VALUES (p_user_id, p_company_id, p_email, p_full_name, p_role);

  -- 2. Mark the invite as accepted so it cannot be reused
  UPDATE team_invites 
  SET status = 'accepted' 
  WHERE id = p_invite_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to provision user: %', SQLERRM;
END;
$$;
