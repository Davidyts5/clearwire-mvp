-- STORAGE BUCKET MIGRATION
-- Run this in your Supabase SQL Editor to securely configure the 'invoices' bucket.

-- Instead of altering the core storage.objects table (which requires superuser),
-- we just create the policies. Supabase Cloud already manages the RLS state of this table.

-- Delete any existing policies on the bucket to prevent conflicts
DROP POLICY IF EXISTS "Tenant Isolation for Invoice Uploads" ON storage.objects;
DROP POLICY IF EXISTS "Tenant Isolation for Invoice Reads" ON storage.objects;

-- UPLOAD POLICY: Clerks can only upload invoices to their own company's folder.
CREATE POLICY "Tenant Isolation for Invoice Uploads" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'invoices' AND
  (storage.foldername(name))[1] = (SELECT company_id::text FROM public.users WHERE id = auth.uid())
);

-- READ POLICY: CFOs and Controllers can only read invoices stored in their company's folder.
CREATE POLICY "Tenant Isolation for Invoice Reads" ON storage.objects
FOR SELECT TO authenticated USING (
  bucket_id = 'invoices' AND
  (storage.foldername(name))[1] = (SELECT company_id::text FROM public.users WHERE id = auth.uid())
);
