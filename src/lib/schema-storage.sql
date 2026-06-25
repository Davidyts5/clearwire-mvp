-- STORAGE BUCKET MIGRATION
-- Run this in your Supabase SQL Editor to securely configure the 'invoices' bucket.

-- 1. Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('invoices', 'invoices', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Delete any existing policies on the bucket to prevent conflicts
DROP POLICY IF EXISTS "Tenant Isolation for Invoice Uploads" ON storage.objects;
DROP POLICY IF EXISTS "Tenant Isolation for Invoice Reads" ON storage.objects;

-- 3. ENABLE ROW LEVEL SECURITY ON STORAGE
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 4. UPLOAD POLICY: Users can only upload invoices to their own company's folder.
-- We force the storage path to match their company_id (e.g., "company_id/wire_id.pdf")
CREATE POLICY "Tenant Isolation for Invoice Uploads" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'invoices' AND
  -- Ensure the first part of the folder path exactly matches their secure company_id
  (storage.foldername(name))[1] = (SELECT company_id::text FROM public.users WHERE id = auth.uid())
);

-- 5. READ POLICY: Users can only read invoices stored in their company's folder.
CREATE POLICY "Tenant Isolation for Invoice Reads" ON storage.objects
FOR SELECT TO authenticated USING (
  bucket_id = 'invoices' AND
  (storage.foldername(name))[1] = (SELECT company_id::text FROM public.users WHERE id = auth.uid())
);
