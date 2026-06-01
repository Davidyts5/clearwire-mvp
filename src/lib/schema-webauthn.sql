-- WEBAUTHN COMPLETE SCHEMA MIGRATION

-- 1. Create the authenticators table
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

-- 2. Create the challenges table
CREATE TABLE IF NOT EXISTS webauthn_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  challenge TEXT NOT NULL,
  context TEXT NOT NULL, 
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Temporarily disable RLS to avoid permission blocks during testing
ALTER TABLE user_authenticators DISABLE ROW LEVEL SECURITY;
ALTER TABLE webauthn_challenges DISABLE ROW LEVEL SECURITY;
