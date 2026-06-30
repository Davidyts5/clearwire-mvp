-- V11: VENDOR MANAGEMENT & CHANGE CONTROL ARCHITECTURE

-- 1. Upgrade Vendors Table
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive'));
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected'));
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);

-- 2. Create Vendor Change Requests Table
CREATE TABLE IF NOT EXISTS vendor_change_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) NOT NULL,
  vendor_id UUID REFERENCES vendors(id) NOT NULL,
  requested_by UUID REFERENCES users(id) NOT NULL,
  reviewed_by UUID REFERENCES users(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  old_data JSONB,
  new_data JSONB NOT NULL,
  reason TEXT,
  rejection_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enhance Audit Logs
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS metadata JSONB;

-- 4. Enable RLS and Isolation Policies
ALTER TABLE vendor_change_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant Isolation" ON vendor_change_requests 
  FOR ALL USING (company_id = auth_user_company_id()) 
  WITH CHECK (company_id = auth_user_company_id());

-- 5. Atomic Vendor Approval RPC
CREATE OR REPLACE FUNCTION approve_vendor_change(
  p_request_id UUID,
  p_actor_id UUID
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_req vendor_change_requests%ROWTYPE;
  v_vendor vendors%ROWTYPE;
BEGIN
  SELECT * INTO v_req FROM vendor_change_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF v_req.status != 'pending' THEN RAISE EXCEPTION 'Request already processed'; END IF;
  
  -- SoD Enforcement
  IF v_req.requested_by = p_actor_id THEN
    RAISE EXCEPTION 'SOD_VIOLATION: Cannot approve your own vendor change request.';
  END IF;

  -- Update request status
  UPDATE vendor_change_requests
  SET status = 'approved', reviewed_by = p_actor_id, updated_at = NOW()
  WHERE id = p_request_id
  RETURNING * INTO v_req;

  -- Update actual vendor record
  UPDATE vendors
  SET 
    account_number = v_req.new_data->>'account_number',
    swift_bic = v_req.new_data->>'swift_bic',
    account_name = v_req.new_data->>'account_name',
    verification_status = 'verified'
  WHERE id = v_req.vendor_id
  RETURNING * INTO v_vendor;

  -- Audit Log
  INSERT INTO audit_logs (company_id, wire_id, actor_id, action, new_hash, metadata)
  VALUES (v_req.company_id, '00000000-0000-0000-0000-000000000000', p_actor_id, 'VENDOR_CHANGE_APPROVED', 'SYSTEM', jsonb_build_object('vendor_id', v_vendor.id, 'request_id', p_request_id));

  RETURN to_jsonb(v_vendor);
END;
$$;

REVOKE EXECUTE ON FUNCTION approve_vendor_change(UUID, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION approve_vendor_change(UUID, UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION approve_vendor_change(UUID, UUID) TO service_role;
