-- V23 MIGRATION: Secure Company Onboarding & Tenant Provisioning

-- 1. Add Unique Slug to Companies
ALTER TABLE companies ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- 2. Atomic Provisioning RPC
-- This function runs with elevated privileges to bypass RLS during the exact moment of creation.
-- It guarantees that a company and its owner are created together, or not at all.
CREATE OR REPLACE FUNCTION onboard_new_tenant(
  p_auth_id UUID,
  p_email TEXT,
  p_full_name TEXT,
  p_company_name TEXT
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_company_id UUID;
  v_base_slug TEXT;
  v_final_slug TEXT;
  v_counter INTEGER := 1;
BEGIN
  -- 1. Generate base slug (lowercase, alphanumeric, hyphens for spaces)
  v_base_slug := lower(regexp_replace(p_company_name, '[^a-zA-Z0-9]+', '-', 'g'));
  v_base_slug := trim(both '-' from v_base_slug);
  
  IF v_base_slug = '' THEN
    v_base_slug := 'workspace';
  END IF;

  v_final_slug := v_base_slug;

  -- 2. Ensure Slug Uniqueness
  WHILE EXISTS (SELECT 1 FROM companies WHERE slug = v_final_slug) LOOP
    v_counter := v_counter + 1;
    v_final_slug := v_base_slug || '-' || v_counter::text;
  END LOOP;

  -- 3. Create the Company Workspace
  INSERT INTO companies (name, slug)
  VALUES (p_company_name, v_final_slug)
  RETURNING id INTO v_company_id;

  -- 4. Create the Owner (CFO)
  INSERT INTO users (id, company_id, email, full_name, role, approval_limit, can_unfreeze)
  VALUES (p_auth_id, v_company_id, p_email, p_full_name, 'cfo', 999999999, true);

  -- 5. Seed default company settings
  INSERT INTO company_settings (company_id) 
  VALUES (v_company_id);

  RETURN jsonb_build_object(
    'company_id', v_company_id,
    'slug', v_final_slug,
    'user_id', p_auth_id
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to provision tenant: %', SQLERRM;
END;
$$;

-- Secure the RPC from unauthorized direct execution
REVOKE EXECUTE ON FUNCTION onboard_new_tenant(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION onboard_new_tenant(UUID, TEXT, TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION onboard_new_tenant(UUID, TEXT, TEXT, TEXT) TO service_role;
