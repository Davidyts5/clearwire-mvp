-- 1. Wipe the old tables
DROP TABLE IF EXISTS wire_requests CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS companies CASCADE;

-- 2. Create Companies
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Users
CREATE TABLE users (
  id UUID PRIMARY KEY, -- Links to auth.users
  company_id UUID REFERENCES companies(id) NOT NULL,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('clerk', 'cfo')),
  phone_number TEXT,
  passkey_credential_id TEXT, 
  passkey_public_key TEXT,    
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create Wire Requests
CREATE TABLE wire_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  vendor_name TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  purpose TEXT, 
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  anti_ai_phrase TEXT NOT NULL,
  clerk_id UUID REFERENCES users(id),
  cfo_id UUID REFERENCES users(id),
  cryptographic_hash TEXT, 
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ
);

-- 5. Disable RLS entirely for now so you don't hit database permission blocks
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE wire_requests DISABLE ROW LEVEL SECURITY;
