-- TEAM MANAGEMENT SCHEMA UPGRADE (v4.0)

-- 1. Create Team Invites Table
CREATE TABLE IF NOT EXISTS team_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('clerk', 'controller', 'cfo', 'auditor')),
  invited_by UUID REFERENCES users(id) NOT NULL,
  token TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, email)
);

-- 2. Create the Settings Table
CREATE TABLE IF NOT EXISTS company_settings (
  company_id UUID PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  approval_tiers JSONB NOT NULL DEFAULT '{"tier1": {"max": 10000, "role": "controller"}, "tier2": {"max": 100000, "role": "cfo"}, "tier3": {"max": null, "role": "multi-sig"}}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE team_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- 4. Safe Policy Creation
DROP POLICY IF EXISTS "Strict Tenant Isolation" ON team_invites;
CREATE POLICY "Strict Tenant Isolation" ON team_invites 
  FOR ALL USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Strict Tenant Isolation" ON company_settings;
CREATE POLICY "Strict Tenant Isolation" ON company_settings 
  FOR ALL USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
