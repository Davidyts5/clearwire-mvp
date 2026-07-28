-- V36 MIGRATION: Vendor Change Request Callback Verification

ALTER TABLE vendor_callback_verifications ADD COLUMN change_request_id UUID REFERENCES vendor_change_requests(id);
ALTER TABLE vendor_callback_verifications ALTER COLUMN wire_id DROP NOT NULL;
