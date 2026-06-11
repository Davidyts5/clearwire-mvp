-- PRODUCTION HARDENING SCRIPT
-- Run this in the Supabase SQL Editor once testing is complete and you are ready for real clients.

-- 1. TURN THE VAULT LOCKS BACK ON
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE wire_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_authenticators ENABLE ROW LEVEL SECURITY;
ALTER TABLE webauthn_challenges ENABLE ROW LEVEL SECURITY;

-- 2. ENFORCE STRICT DATA ISOLATION POLICIES (No Cross-Tenant Access)
-- Drop existing loose policies if they exist
DROP POLICY IF EXISTS "Tenant Isolation" ON companies;
DROP POLICY IF EXISTS "Tenant Isolation" ON users;
DROP POLICY IF EXISTS "Tenant Isolation" ON vendors;
DROP POLICY IF EXISTS "Tenant Isolation" ON wire_requests;
DROP POLICY IF EXISTS "Tenant Isolation" ON audit_logs;

-- Recreate policies with strict matching to the authenticated user's company_id
CREATE POLICY "Strict Tenant Isolation" ON companies 
  FOR SELECT USING (id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Strict Tenant Isolation" ON users 
  FOR SELECT USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Strict Tenant Isolation" ON vendors 
  FOR ALL USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Strict Tenant Isolation" ON wire_requests 
  FOR ALL USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()))
  WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Strict Tenant Isolation" ON audit_logs 
  FOR SELECT USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
  
-- Audit logs can only be inserted, never updated or deleted
CREATE POLICY "Strict Tenant Isolation Insert" ON audit_logs 
  FOR INSERT WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- Device policies
CREATE POLICY "Users manage own authenticators" ON user_authenticators 
  FOR ALL USING (user_id = auth.uid());
  
CREATE POLICY "Users manage own challenges" ON webauthn_challenges 
  FOR ALL USING (user_id = auth.uid());
  
-- 3. THE WORM AUDIT LOG TRIGGER
-- Physically prevents any UPDATE or DELETE operation on the audit_logs table
CREATE OR REPLACE FUNCTION prevent_audit_tampering() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are immutable and cannot be altered or deleted.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_audit_update ON audit_logs;
CREATE TRIGGER trg_prevent_audit_update 
  BEFORE UPDATE OR DELETE ON audit_logs 
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_tampering();
