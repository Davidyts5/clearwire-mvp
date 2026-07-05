-- FIX: Update the status constraint on wire_requests to include all valid states
-- The database previously crashed because it didn't recognize 'frozen' as a valid status.

ALTER TABLE wire_requests DROP CONSTRAINT IF EXISTS wire_requests_status_check;

ALTER TABLE wire_requests ADD CONSTRAINT wire_requests_status_check 
  CHECK (status IN ('pending', 'frozen', 'under_review', 'approved', 'denied'));
