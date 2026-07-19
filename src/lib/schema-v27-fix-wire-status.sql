-- V27 MIGRATION: Allow multi-sig pending states in wire_requests status
-- The transition_wire_state RPC (v18) sets status to 'pending_cfo' and
-- 'pending_second_approval', but the CHECK constraint never allowed those
-- values, meaning any wire requiring a second signature would fail to
-- transition at all.
ALTER TABLE wire_requests DROP CONSTRAINT IF EXISTS wire_requests_status_check;
ALTER TABLE wire_requests ADD CONSTRAINT wire_requests_status_check
  CHECK (status IN ('pending', 'frozen', 'under_review', 'approved', 'denied', 'pending_cfo', 'pending_second_approval'));
