-- V28 MIGRATION: Reminder & Escalation Tracking
ALTER TABLE wire_requests ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMPTZ;
ALTER TABLE wire_requests ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ;
