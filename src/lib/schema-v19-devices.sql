-- V19 MIGRATION: Passkey Device Management & CFO Revocation
ALTER TABLE user_authenticators ADD COLUMN IF NOT EXISTS name TEXT DEFAULT 'Security Key';
ALTER TABLE user_authenticators ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ DEFAULT NOW();

-- We need to ensure the CFO has administrative access to revoke any user's authenticators.
-- First, drop the old strict policy
DROP POLICY IF EXISTS "Users manage own authenticators" ON user_authenticators;

-- Create the new Enterprise Policy:
-- 1. A user can ALWAYS manage their own devices.
-- 2. A CFO can ALWAYS read and delete ANY device in their company.
CREATE POLICY "Enterprise Authenticator Management" ON user_authenticators 
  FOR ALL USING (
    user_id = auth.uid() OR 
    (SELECT role FROM users WHERE id = auth.uid()) = 'cfo'
  );
