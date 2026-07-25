-- V30 MIGRATION: Fix Rate Limiting & Vendor Conflicts

-- 1. Create a persistent rate limit table (replaces the broken in-memory map)
CREATE TABLE rate_limits (
  identifier TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 1,
  reset_time BIGINT NOT NULL
);

-- We need an RPC to handle the atomic UPSERT operation safely
CREATE OR REPLACE FUNCTION enforce_rate_limit(p_identifier TEXT, p_limit INTEGER, p_window_ms BIGINT, p_now BIGINT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
  v_reset_time BIGINT;
BEGIN
  -- Try to get existing record
  SELECT count, reset_time INTO v_count, v_reset_time
  FROM rate_limits
  WHERE identifier = p_identifier FOR UPDATE;

  IF NOT FOUND OR p_now > v_reset_time THEN
    -- Insert or Reset
    INSERT INTO rate_limits (identifier, count, reset_time)
    VALUES (p_identifier, 1, p_now + p_window_ms)
    ON CONFLICT (identifier) DO UPDATE
    SET count = 1, reset_time = p_now + p_window_ms;
    RETURN TRUE;
  END IF;

  IF v_count >= p_limit THEN
    RETURN FALSE;
  END IF;

  -- Increment
  UPDATE rate_limits SET count = count + 1 WHERE identifier = p_identifier;
  RETURN TRUE;
END;
$$;

-- 2. Add case-insensitive unique index for vendors
-- Prevent bypassing risk-engine checks via slight variations in vendor names.
CREATE UNIQUE INDEX vendors_name_ci_idx ON vendors (company_id, lower(trim(name)));

-- Execute this in your Supabase SQL Editor.
