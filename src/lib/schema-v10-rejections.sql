-- V10: CONTEXTUAL REJECTION ENGINE
-- Adds operational feedback loops for declined wire requests

-- 1. Add columns to store the reason and notes
ALTER TABLE wire_requests ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE wire_requests ADD COLUMN IF NOT EXISTS rejection_notes TEXT;

-- (No RLS changes required as these columns inherit the existing table policies)
