-- AUTOMATED MIGRATION SCRIPT TO FIX ROLE & PRIVILEGE ANOMALIES

-- 1. STRIP UNLIMITED POWER FROM CLERKS AND AUDITORS
-- If a clerk or auditor accidentally received an approval_limit > 0, 
-- this permanently resets their power back to $0 to prevent privilege escalation.
UPDATE users 
SET approval_limit = 0 
WHERE role IN ('clerk', 'auditor') AND approval_limit > 0;

-- 2. ENSURE ALL TABLES HAVE THE EXACT SAME ROLE CONSTRAINTS
-- Drops the old constraints and adds identical constraints across the system
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('clerk', 'controller', 'cfo', 'auditor'));

ALTER TABLE team_invites DROP CONSTRAINT IF EXISTS team_invites_role_check;
ALTER TABLE team_invites ADD CONSTRAINT team_invites_role_check 
  CHECK (role IN ('clerk', 'controller', 'cfo', 'auditor'));

-- 3. CLEAN UP EXPIRED INVITES (Maintenance)
-- Automatically deletes any invite tokens that have expired and were never used
DELETE FROM team_invites 
WHERE status = 'pending' AND expires_at < NOW();
