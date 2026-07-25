-- V11 MIGRATION: Resolve Final Edge Cases and Auth Recursions
-- This ensures the Controller dashboard correctly reads approval_limit without infinite recursion.

-- 1. DROP ALL POTENTIAL CONFLICTING POLICIES ON USERS
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Strict Tenant Isolation" ON users;
DROP POLICY IF EXISTS "Tenant Isolation" ON users;
DROP POLICY IF EXISTS "Users can read tenant profiles" ON users;

-- 2. CREATE A BULLETPROOF RECURSION-FREE POLICY
-- Uses the SECURITY DEFINER function auth_user_company_id() established in V7
-- to safely check the tenant ID without recursively querying the users table.
CREATE POLICY "Tenant Isolation" ON users 
  FOR SELECT USING (company_id = auth_user_company_id());

-- 3. ENSURE APPROVAL LIMIT EXISTS
ALTER TABLE users ADD COLUMN IF NOT EXISTS approval_limit DECIMAL(12,2) DEFAULT 0;
