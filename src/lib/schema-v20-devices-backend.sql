-- V20 MIGRATION: Passkey Device Management Backend
-- Extending the existing user_authenticators table safely.

ALTER TABLE user_authenticators ADD COLUMN IF NOT EXISTS device_name TEXT DEFAULT 'Security Key';
ALTER TABLE user_authenticators ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE user_authenticators ADD COLUMN IF NOT EXISTS revoked BOOLEAN DEFAULT FALSE;

-- Ensure RLS allows users to manage their own authenticators
DROP POLICY IF EXISTS "Users manage own authenticators" ON user_authenticators;
CREATE POLICY "Users manage own authenticators" ON user_authenticators 
  FOR ALL USING (user_id = auth.uid());
