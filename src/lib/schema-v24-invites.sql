-- V24 MIGRATION: Enterprise Team Invitations Lifecycle

-- 1. Modify team_invites to support 'cancelled' status
ALTER TABLE team_invites DROP CONSTRAINT IF EXISTS team_invites_status_check;
ALTER TABLE team_invites ADD CONSTRAINT team_invites_status_check 
  CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled'));

-- 2. Add full_name so the invitee knows who they are intended to be
ALTER TABLE team_invites ADD COLUMN IF NOT EXISTS full_name TEXT;

-- 3. We previously had UNIQUE(company_id, email) to prevent multiple invites.
-- But if a CFO "cancels" an invite and wants to re-invite them later, that UNIQUE constraint blocks them!
-- So we must drop the strict unique constraint. (We will handle duplicate 'pending' logic at the API layer instead).
ALTER TABLE team_invites DROP CONSTRAINT IF EXISTS team_invites_company_id_email_key;
