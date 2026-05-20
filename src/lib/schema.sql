-- Run this in the Supabase SQL Editor to create the database schema

-- Users (Clerks and CFOs)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('clerk', 'cfo')),
  phone_number TEXT,
  passkey_credential_id TEXT, -- Stores WebAuthn credential ID
  passkey_public_key TEXT,    -- Stores WebAuthn public key
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wire Requests
CREATE TABLE wire_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_name TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  anti_ai_phrase TEXT NOT NULL,
  clerk_id UUID REFERENCES users(id),
  cfo_id UUID REFERENCES users(id),
  cryptographic_hash TEXT, -- Stored after successful Passkey signature
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ
);
