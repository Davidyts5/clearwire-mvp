-- DIAGNOSTIC AUDIT SCRIPT
-- Run these queries individually in the Supabase SQL Editor to detect architectural anomalies.

-- 1. DETECT INVALID / IMPOSSIBLE ROLES
-- Finds any user whose role string bypasses our expected application logic
SELECT id, email, role 
FROM users 
WHERE role NOT IN ('clerk', 'controller', 'cfo', 'auditor');

-- 2. DETECT MISSING ROLES
-- (Should return 0 rows due to NOT NULL constraint, but acts as a safety check)
SELECT id, email 
FROM users 
WHERE role IS NULL OR TRIM(role) = '';

-- 3. DETECT ORPHANED USERS (Identity Mismatch)
-- Finds users in our public schema that do not have a matching secure identity in the auth schema
SELECT u.id, u.email 
FROM users u 
LEFT JOIN auth.users au ON u.id = au.id 
WHERE au.id IS NULL;

-- 4. DETECT ORPHANED USERS (Tenant Mismatch)
-- Finds users who are not assigned to a valid, existing company
SELECT id, email, company_id 
FROM users u 
WHERE NOT EXISTS (SELECT 1 FROM companies c WHERE c.id = u.company_id);

-- 5. DETECT PRIVILEGE ESCALATION / LOGIC MISMATCHES
-- Finds users who have an approval limit > $0, but whose role strictly forbids approving wires
SELECT id, email, role, approval_limit 
FROM users 
WHERE role IN ('clerk', 'auditor') AND approval_limit > 0;

-- 6. DETECT CONTROLLERS WITH UNLIMITED POWER
-- Finds controllers who accidentally got an unlimited/null limit (should be explicitly set)
SELECT id, email, role, approval_limit 
FROM users 
WHERE role = 'controller' AND (approval_limit IS NULL OR approval_limit = 0);
