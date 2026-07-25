-- V34 MIGRATION: Make audit_logs.wire_id nullable for non-wire events
ALTER TABLE audit_logs ALTER COLUMN wire_id DROP NOT NULL;
