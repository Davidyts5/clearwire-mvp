-- V16 MIGRATION: Configurable Vendor Authorization Policies
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS vendor_auth_policy TEXT DEFAULT 'controller_any' CHECK (vendor_auth_policy IN ('controller_any', 'cfo_always', 'cfo_bank_only'));
