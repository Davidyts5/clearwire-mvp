-- Run this in the Supabase SQL Editor to reset and create the full schema

-- 1. Drop existing tables to start fresh (WARNING: THIS DELETES ALL TEST DATA)
DROP TABLE IF EXISTS wire_requests CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 2. Create the Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('clerk', 'cfo')),
  phone_number TEXT,
  passkey_credential_id TEXT, 
  passkey_public_key TEXT,    
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create the Wire Requests table (Now with the 'purpose' column included)
CREATE TABLE wire_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_name TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  purpose TEXT, -- The new column added in the latest update
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  anti_ai_phrase TEXT NOT NULL,
  clerk_id UUID REFERENCES users(id),
  cfo_id UUID REFERENCES users(id),
  cryptographic_hash TEXT, 
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ
);

-- 4. Disable Row Level Security (RLS) so Vercel can write freely during the MVP demo phase
ALTER TABLE wire_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
