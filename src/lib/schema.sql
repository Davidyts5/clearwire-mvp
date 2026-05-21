-- Run this in your Supabase SQL Editor.
-- This ensures Vercel can write to the database freely while you do your sales demos.

ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE wire_requests DISABLE ROW LEVEL SECURITY;
