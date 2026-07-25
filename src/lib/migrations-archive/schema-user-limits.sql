-- USER-SPECIFIC APPROVAL LIMITS MIGRATION

-- 1. Add approval_limit to users and team_invites tables
ALTER TABLE users ADD COLUMN IF NOT EXISTS approval_limit DECIMAL(12,2) DEFAULT 0;
ALTER TABLE team_invites ADD COLUMN IF NOT EXISTS approval_limit DECIMAL(12,2) DEFAULT 0;

-- 2. Update the Provisioning RPC to include the approval limit
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
SECURITY DEFINER
AS $$
BEGIN
  -- Insert the user with their specific approval limit
  INSERT INTO users (id, company_id, email, full_name, role, approval_limit)
  VALUES (p_user_id, p_company_id, p_email, p_full_name, p_role, p_approval_limit);

  -- Mark the invite as accepted
  UPDATE team_invites 
  SET status = 'accepted' 
  WHERE id = p_invite_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to provision user: %', SQLERRM;
END;
$$;
