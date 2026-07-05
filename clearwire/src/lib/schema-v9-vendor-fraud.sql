-- V9 VENDOR INTELLIGENCE & FRAUD PREVENTION SCHEMA

-- 1. Upgrade Vendors Table with Strict Banking Details
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS account_name TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS account_number TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS swift_bic TEXT;

-- 2. Upgrade Wire Requests to capture banking snapshots for the WORM audit
ALTER TABLE wire_requests ADD COLUMN IF NOT EXISTS account_number_snapshot TEXT;
ALTER TABLE wire_requests ADD COLUMN IF NOT EXISTS swift_bic_snapshot TEXT;
ALTER TABLE wire_requests ADD COLUMN IF NOT EXISTS invoice_number TEXT;

-- 3. CFO Delegation Privileges
ALTER TABLE users ADD COLUMN IF NOT EXISTS can_unfreeze BOOLEAN DEFAULT false;
ALTER TABLE team_invites ADD COLUMN IF NOT EXISTS can_unfreeze BOOLEAN DEFAULT false;

-- 4. Re-create the Provisioning RPC to include the new privilege
DROP FUNCTION IF EXISTS provision_invited_user(UUID, UUID, TEXT, TEXT, TEXT, UUID, DECIMAL);
DROP FUNCTION IF EXISTS provision_invited_user(UUID, UUID, TEXT, TEXT, TEXT, UUID, DECIMAL, BOOLEAN);

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
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO users (id, company_id, email, full_name, role, approval_limit, can_unfreeze)
  VALUES (p_user_id, p_company_id, p_email, p_full_name, p_role, p_approval_limit, p_can_unfreeze);

  UPDATE team_invites SET status = 'accepted' WHERE id = p_invite_id;
EXCEPTION
  WHEN OTHERS THEN RAISE EXCEPTION 'Failed to provision user: %', SQLERRM;
END;
$$;

REVOKE EXECUTE ON FUNCTION provision_invited_user(UUID, UUID, TEXT, TEXT, TEXT, UUID, DECIMAL, BOOLEAN) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION provision_invited_user(UUID, UUID, TEXT, TEXT, TEXT, UUID, DECIMAL, BOOLEAN) FROM authenticated;
GRANT EXECUTE ON FUNCTION provision_invited_user(UUID, UUID, TEXT, TEXT, TEXT, UUID, DECIMAL, BOOLEAN) TO service_role;
