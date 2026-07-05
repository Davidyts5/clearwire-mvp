-- FINAL DATABASE SYNCHRONIZATION
-- This script ensures all tables, columns, and structures are perfectly aligned with the codebase.

-- 1. Ensure wire_requests has all necessary columns for the Risk Engine
ALTER TABLE wire_requests ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES vendors(id);
ALTER TABLE wire_requests ADD COLUMN IF NOT EXISTS vendor_name_snapshot TEXT DEFAULT 'Unknown';
ALTER TABLE wire_requests ADD COLUMN IF NOT EXISTS risk_score INTEGER DEFAULT 0;
ALTER TABLE wire_requests ADD COLUMN IF NOT EXISTS risk_reasons JSONB;

-- 2. Ensure Authenticators Table Exists
CREATE TABLE IF NOT EXISTS user_authenticators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  credential_id TEXT UNIQUE NOT NULL,
  credential_public_key TEXT NOT NULL, 
  counter BIGINT NOT NULL DEFAULT 0,   
  credential_device_type TEXT NOT NULL,
  credential_backed_up BOOLEAN NOT NULL DEFAULT FALSE,
  transports JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Ensure Challenges Table Exists
CREATE TABLE IF NOT EXISTS webauthn_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  challenge TEXT NOT NULL,
  context TEXT NOT NULL, 
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Disable RLS for testing
ALTER TABLE user_authenticators DISABLE ROW LEVEL SECURITY;
ALTER TABLE webauthn_challenges DISABLE ROW LEVEL SECURITY;
