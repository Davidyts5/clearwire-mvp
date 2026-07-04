-- V14 MIGRATION: Vendor Restriction Constraints
-- When we added the 'status' column to vendors in V12, we likely didn't include 
-- 'restricted' in the CHECK constraint, causing database rejections when the CFO restricts a vendor.

ALTER TABLE vendors DROP CONSTRAINT IF EXISTS vendors_status_check;
ALTER TABLE vendors ADD CONSTRAINT vendors_status_check 
  CHECK (status IN ('active', 'inactive', 'restricted', 'archived'));
