-- WEBAUTHN ENTERPRISE SCHEMA ADDITIONS

-- 1. Authenticators (Stores the Public Keys of CFOs' iPhones/MacBooks)
CREATE TABLE user_authenticators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  credential_id TEXT UNIQUE NOT NULL,
  credential_public_key TEXT NOT NULL, -- Stored as Base64 string
  counter BIGINT NOT NULL DEFAULT 0,   -- Prevents Replay Attacks
  credential_device_type TEXT NOT NULL,
  credential_backed_up BOOLEAN NOT NULL DEFAULT FALSE,
  transports JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Challenges (Secure Server-Side Challenge Storage)
CREATE TABLE webauthn_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  challenge TEXT NOT NULL,
  context TEXT NOT NULL, -- e.g., 'registration' or 'wire_approval:1234'
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS POLICIES
ALTER TABLE user_authenticators ENABLE ROW LEVEL SECURITY;
ALTER TABLE webauthn_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own authenticators" ON user_authenticators FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users can manage their own challenges" ON webauthn_challenges FOR ALL USING (user_id = auth.uid());
