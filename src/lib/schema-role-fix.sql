-- FIX: Update the strict Role Check Constraint on the users table
-- The original table was created before we added the 'controller' and 'auditor' roles to the UI.

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('clerk', 'controller', 'cfo', 'auditor'));
