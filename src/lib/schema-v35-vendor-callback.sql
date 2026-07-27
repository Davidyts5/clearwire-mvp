-- V35 MIGRATION: Vendor Callback Verification
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE wire_requests ADD COLUMN IF NOT EXISTS phone_number_snapshot TEXT;

CREATE TABLE IF NOT EXISTS vendor_callback_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wire_id UUID REFERENCES wire_requests(id) NOT NULL,
    company_id UUID REFERENCES companies(id) NOT NULL,
    verified_by UUID REFERENCES users(id) NOT NULL,
    phone_number_called TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    notes TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE vendor_callback_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant Isolation" ON vendor_callback_verifications 
    FOR ALL USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()))
    WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
