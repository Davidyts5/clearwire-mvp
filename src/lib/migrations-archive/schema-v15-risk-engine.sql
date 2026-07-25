-- V15 MIGRATION: Risk Engine Configurations
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS risk_profile TEXT DEFAULT 'standard' CHECK (risk_profile IN ('conservative', 'standard', 'aggressive', 'custom'));
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS freeze_first_payment BOOLEAN DEFAULT false;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS freeze_bank_changes BOOLEAN DEFAULT false;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS freeze_international_payment BOOLEAN DEFAULT false;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS freeze_missing_invoice BOOLEAN DEFAULT false;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS freeze_high_risk_countries BOOLEAN DEFAULT false;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS freeze_above_amount BOOLEAN DEFAULT false;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS freeze_amount_threshold DECIMAL(12,2) DEFAULT 0;
