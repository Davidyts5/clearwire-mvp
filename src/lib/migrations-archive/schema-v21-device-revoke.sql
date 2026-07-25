-- V21 MIGRATION: Passkey Device Revocation
ALTER TABLE user_authenticators ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;
ALTER TABLE user_authenticators ADD COLUMN IF NOT EXISTS revoked_by UUID REFERENCES users(id);
