-- CLEARWIRE ENTERPRISE SCHEMA (v2.0)
-- Strict Multi-Tenancy, Risk Scoring, and Immutable Audits

DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS wire_requests CASCADE;
DROP TABLE IF EXISTS vendors CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS companies CASCADE;

-- 1. COMPANIES (Tenants)
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  domain_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. USERS (RBAC)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  company_id UUID REFERENCES companies(id) NOT NULL,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('clerk', 'controller', 'cfo', 'auditor')),
  passkey_credential_id TEXT, 
  passkey_public_key TEXT,    
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. VENDORS (Risk Tracking)
CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  name TEXT NOT NULL,
  account_last_four TEXT,
  trusted_score INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, name)
);

-- 4. WIRE REQUESTS
CREATE TABLE wire_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  vendor_id UUID REFERENCES vendors(id),
  vendor_name_snapshot TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  purpose TEXT NOT NULL, 
  risk_score INTEGER NOT NULL DEFAULT 0,
  risk_reasons JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'frozen', 'approved', 'denied')),
  clerk_id UUID REFERENCES users(id) NOT NULL,
  cfo_id UUID REFERENCES users(id),
  cryptographic_hash TEXT, 
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ
);

-- 5. IMMUTABLE AUDIT LOGS (WORM Storage Simulation)
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  wire_id UUID REFERENCES wire_requests(id) NOT NULL,
  actor_id UUID REFERENCES users(id) NOT NULL,
  action TEXT NOT NULL,
  ip_address TEXT,
  previous_hash TEXT,
  new_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ENTERPRISE ROW LEVEL SECURITY (RLS)
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE wire_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- POLICIES (Users only see their own company data)
CREATE POLICY "Tenant Isolation" ON companies FOR SELECT USING (id = (SELECT company_id FROM users WHERE id = auth.uid()));
CREATE POLICY "Tenant Isolation" ON users FOR SELECT USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
CREATE POLICY "Tenant Isolation" ON vendors FOR ALL USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
CREATE POLICY "Tenant Isolation" ON wire_requests FOR ALL USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
CREATE POLICY "Tenant Isolation" ON audit_logs FOR SELECT USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
