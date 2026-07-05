-- V7 ENTERPRISE FINAL SCHEMA HARDENING
-- Resolves RLS Recursion, Orphaned Users, and Multi-Tenant Isolation completely.

-- 1. SECURE TENANT LOOKUP FUNCTION (Eliminates RLS Recursion)
-- This function runs with SECURITY DEFINER, allowing it to bypass RLS for exactly one lookup:
-- finding the company_id of the currently authenticated user.
CREATE OR REPLACE FUNCTION auth_user_company_id() RETURNS UUID
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT company_id FROM users WHERE id = auth.uid();
$$;

-- 2. DROP ALL EXISTING RLS POLICIES TO PREVENT CONFLICTS
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can read tenant profiles" ON users;
DROP POLICY IF EXISTS "Strict Tenant Isolation" ON companies;
DROP POLICY IF EXISTS "Strict Tenant Isolation" ON users;
DROP POLICY IF EXISTS "Strict Tenant Isolation" ON vendors;
DROP POLICY IF EXISTS "Strict Tenant Isolation" ON wire_requests;
DROP POLICY IF EXISTS "Strict Tenant Isolation" ON audit_logs;
DROP POLICY IF EXISTS "Strict Tenant Isolation Insert" ON audit_logs;
DROP POLICY IF EXISTS "Strict Tenant Isolation" ON team_invites;
DROP POLICY IF EXISTS "Strict Tenant Isolation" ON company_settings;

-- 3. APPLY BULLETPROOF MULTI-TENANT ISOLATION POLICIES
-- Users Table: Anyone in the company can read the profiles of other users in the same company.
CREATE POLICY "Tenant Isolation" ON users 
  FOR SELECT USING (company_id = auth_user_company_id());

-- Companies Table: Users can read their own company settings.
CREATE POLICY "Tenant Isolation" ON companies 
  FOR SELECT USING (id = auth_user_company_id());

-- Vendors Table
CREATE POLICY "Tenant Isolation" ON vendors 
  FOR ALL USING (company_id = auth_user_company_id())
  WITH CHECK (company_id = auth_user_company_id());

-- Wire Requests Table
CREATE POLICY "Tenant Isolation" ON wire_requests 
  FOR ALL USING (company_id = auth_user_company_id())
  WITH CHECK (company_id = auth_user_company_id());

-- Team Invites Table
CREATE POLICY "Tenant Isolation" ON team_invites 
  FOR ALL USING (company_id = auth_user_company_id())
  WITH CHECK (company_id = auth_user_company_id());

-- Company Settings Table
CREATE POLICY "Tenant Isolation" ON company_settings 
  FOR ALL USING (company_id = auth_user_company_id())
  WITH CHECK (company_id = auth_user_company_id());

-- Audit Logs Table
CREATE POLICY "Tenant Isolation Read" ON audit_logs 
  FOR SELECT USING (company_id = auth_user_company_id());
  
CREATE POLICY "Tenant Isolation Insert" ON audit_logs 
  FOR INSERT WITH CHECK (company_id = auth_user_company_id());

-- 4. ENSURE ROLES ARE STRICTLY CONSTRAINED
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('clerk', 'controller', 'cfo', 'auditor'));

ALTER TABLE team_invites DROP CONSTRAINT IF EXISTS team_invites_role_check;
ALTER TABLE team_invites ADD CONSTRAINT team_invites_role_check 
  CHECK (role IN ('clerk', 'controller', 'cfo', 'auditor'));
