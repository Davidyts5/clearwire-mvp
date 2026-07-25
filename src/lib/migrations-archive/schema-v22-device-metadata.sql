-- V22 MIGRATION: WebAuthn Device Metadata
ALTER TABLE user_authenticators ADD COLUMN IF NOT EXISTS browser TEXT DEFAULT 'Unknown Browser';
ALTER TABLE user_authenticators ADD COLUMN IF NOT EXISTS os TEXT DEFAULT 'Unknown Device';
ALTER TABLE user_authenticators ADD COLUMN IF NOT EXISTS form_factor TEXT DEFAULT 'Desktop';
