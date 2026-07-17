-- V26 MIGRATION: Email Notification Preferences
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN DEFAULT true;
