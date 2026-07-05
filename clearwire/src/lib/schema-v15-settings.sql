ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS risk_strictness TEXT DEFAULT 'standard';
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS freeze_international BOOLEAN DEFAULT true;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS freeze_no_invoice BOOLEAN DEFAULT false;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS require_cfo_vendor_approval BOOLEAN DEFAULT false;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS sms_alert_threshold DECIMAL(12,2) DEFAULT 5000.00;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS enforce_mfa_login BOOLEAN DEFAULT false;
