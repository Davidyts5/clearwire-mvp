-- V13 MIGRATION: Vendor Change Request Workflow
-- Adds new columns for vendors and establishes the change request & history tables

-- 1. Extend Vendors Table
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS payment_instructions TEXT;

-- 2. Vendor Change Requests Table
CREATE TABLE IF NOT EXISTS vendor_change_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  vendor_id UUID REFERENCES vendors(id) NOT NULL,
  requested_by UUID REFERENCES users(id) NOT NULL,
  old_data JSONB NOT NULL,
  new_data JSONB NOT NULL,
  reason TEXT NOT NULL,
  document_path TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'awaiting_cfo', 'approved', 'rejected', 'rejected_flagged')),
  reviewed_by UUID REFERENCES users(id),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

-- 3. Vendor History Table
CREATE TABLE IF NOT EXISTS vendor_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  vendor_id UUID REFERENCES vendors(id) NOT NULL,
  actor_id UUID REFERENCES users(id) NOT NULL,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Secure Tables
ALTER TABLE vendor_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Strict Tenant Isolation" ON vendor_change_requests;
CREATE POLICY "Strict Tenant Isolation" ON vendor_change_requests 
  FOR ALL USING (company_id = auth_user_company_id())
  WITH CHECK (company_id = auth_user_company_id());

DROP POLICY IF EXISTS "Strict Tenant Isolation" ON vendor_history;
CREATE POLICY "Strict Tenant Isolation" ON vendor_history 
  FOR ALL USING (company_id = auth_user_company_id())
  WITH CHECK (company_id = auth_user_company_id());
