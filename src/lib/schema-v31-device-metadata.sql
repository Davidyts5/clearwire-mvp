-- V31 MIGRATION: Device Metadata

-- 1. Add registered_location column to track IP-derived registration locale
ALTER TABLE user_authenticators ADD COLUMN registered_location TEXT;

-- Note: No RLS changes are needed as this table inherits the existing strict tenant policies.
