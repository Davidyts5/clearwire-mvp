-- PRODUCTION HARDENING SCRIPT (V2 - RLS RECURSION FIX)
-- Run this in the Supabase SQL Editor once testing is complete.

-- 1. TURN THE VAULT LOCKS BACK ON
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE wire_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_authenticators ENABLE ROW LEVEL SECURITY;
ALTER TABLE webauthn_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- 2. DROP ALL EXISTING POLICIES TO PREVENT CONFLICTS
DROP POLICY IF EXISTS "Strict Tenant Isolation" ON companies;
DROP POLICY IF EXISTS "Strict Tenant Isolation" ON users;
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Strict Tenant Isolation" ON vendors;
DROP POLICY IF EXISTS "Strict Tenant Isolation" ON wire_requests;
DROP POLICY IF EXISTS "Strict Tenant Isolation" ON audit_logs;
DROP POLICY IF EXISTS "Strict Tenant Isolation Insert" ON audit_logs;
DROP POLICY IF EXISTS "Strict Tenant Isolation" ON team_invites;
DROP POLICY IF EXISTS "Strict Tenant Isolation" ON company_settings;
DROP POLICY IF EXISTS "Users manage own authenticators" ON user_authenticators;
DROP POLICY IF EXISTS "Users manage own challenges" ON webauthn_challenges;

-- 3. THE USERS TABLE RLS (FIXED INFINITE RECURSION)
-- A user can ALWAYS read their own profile. This prevents the database from getting 
-- stuck in a loop trying to look up the company_id.
CREATE POLICY "Users can read own profile" ON users 
  FOR SELECT USING (id = auth.uid());

-- 4. TENANT ISOLATION POLICIES (Using the fixed user lookup)
CREATE POLICY "Strict Tenant Isolation" ON companies 
  FOR SELECT USING (id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Strict Tenant Isolation" ON vendors 
  FOR ALL USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Strict Tenant Isolation" ON wire_requests 
  FOR ALL USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Strict Tenant Isolation" ON team_invites 
  FOR ALL USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Strict Tenant Isolation" ON company_settings 
  FOR ALL USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Strict Tenant Isolation" ON audit_logs 
  FOR SELECT USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
  
CREATE POLICY "Strict Tenant Isolation Insert" ON audit_logs 
  FOR INSERT WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- 5. WEBAUTHN DEVICE POLICIES
CREATE POLICY "Users manage own authenticators" ON user_authenticators 
  FOR ALL USING (user_id = auth.uid());
  
CREATE POLICY "Users manage own challenges" ON webauthn_challenges 
  FOR ALL USING (user_id = auth.uid());
  
-- 6. THE WORM AUDIT LOG TRIGGER
CREATE OR REPLACE FUNCTION prevent_audit_tampering() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are immutable and cannot be altered or deleted.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_audit_update ON audit_logs;
CREATE TRIGGER trg_prevent_audit_update 
  BEFORE UPDATE OR DELETE ON audit_logs 
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_tampering();
