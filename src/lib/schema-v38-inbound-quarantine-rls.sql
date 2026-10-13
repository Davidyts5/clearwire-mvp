-- V38: Enforce inbound quarantine at the database read boundary.
-- Apply after the migration that adds wire_requests.visible_after.
-- These RESTRICTIVE policies compose with (and do not drop or replace) tenant RLS policies.

CREATE OR REPLACE FUNCTION public.current_auth_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT u.role
  FROM public.users AS u
  WHERE u.id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.current_auth_user_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_auth_user_role() TO authenticated, service_role;

-- Storage policies cannot see quarantined wire rows under normal RLS. This narrowly
-- scoped SECURITY DEFINER predicate lets the invoice read policy hide attached files.
CREATE OR REPLACE FUNCTION public.is_wire_invoice_quarantined(p_object_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(public.current_auth_user_role() IN ('cfo', 'controller'), false)
    AND EXISTS (
      SELECT 1
      FROM public.wire_requests AS w
      JOIN public.users AS u ON u.id = auth.uid() AND u.company_id = w.company_id
      WHERE w.invoice_path = p_object_name
        AND (w.visible_after IS NULL OR w.visible_after > now())
    );
$$;

REVOKE ALL ON FUNCTION public.is_wire_invoice_quarantined(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_wire_invoice_quarantined(TEXT) TO authenticated, service_role;

DO $$
BEGIN
  IF to_regprocedure('public.insert_audit_log_occ(uuid,uuid,uuid,text,text,jsonb,text,text,text)') IS NULL THEN
    RAISE EXCEPTION 'V38 requires the existing insert_audit_log_occ WORM function.';
  END IF;

  EXECUTE 'REVOKE EXECUTE ON FUNCTION public.insert_audit_log_occ(uuid, uuid, uuid, text, text, jsonb, text, text, text) FROM PUBLIC, anon, authenticated';
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.insert_audit_log_occ(uuid, uuid, uuid, text, text, jsonb, text, text, text) TO service_role';
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'wire_requests'
      AND column_name = 'visible_after'
  ) THEN
    RAISE EXCEPTION 'V38 requires public.wire_requests.visible_after; apply the quarantine schema first.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'wire_requests'
      AND policyname = 'Inbound quarantine restricts approver reads'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Inbound quarantine restricts approver reads"
      ON public.wire_requests
      AS RESTRICTIVE
      FOR SELECT
      TO authenticated
      USING (
        COALESCE(public.current_auth_user_role(), '') NOT IN ('cfo', 'controller')
        OR visible_after <= now()
      )
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'wire_requests'
      AND policyname = 'Inbound quarantine restricts approver updates'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Inbound quarantine restricts approver updates"
      ON public.wire_requests
      AS RESTRICTIVE
      FOR UPDATE
      TO authenticated
      USING (
        COALESCE(public.current_auth_user_role(), '') NOT IN ('cfo', 'controller')
        OR visible_after <= now()
      )
      WITH CHECK (
        COALESCE(public.current_auth_user_role(), '') NOT IN ('cfo', 'controller')
        OR visible_after <= now()
      )
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'wire_requests'
      AND policyname = 'Inbound quarantine restricts approver deletes'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Inbound quarantine restricts approver deletes"
      ON public.wire_requests
      AS RESTRICTIVE
      FOR DELETE
      TO authenticated
      USING (
        COALESCE(public.current_auth_user_role(), '') NOT IN ('cfo', 'controller')
        OR visible_after <= now()
      )
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'audit_logs'
      AND policyname = 'WORM rows are inserted only through the OCC function'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "WORM rows are inserted only through the OCC function"
      ON public.audit_logs
      AS RESTRICTIVE
      FOR INSERT
      TO authenticated
      WITH CHECK (false)
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'audit_logs'
      AND policyname = 'Inbound quarantine restricts wire audit reads'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Inbound quarantine restricts wire audit reads"
      ON public.audit_logs
      AS RESTRICTIVE
      FOR SELECT
      TO authenticated
      USING (
        COALESCE(public.current_auth_user_role(), '') NOT IN ('cfo', 'controller')
        OR wire_id IS NULL
        OR EXISTS (
          SELECT 1
          FROM public.wire_requests AS w
          WHERE w.id = audit_logs.wire_id
            AND w.company_id = audit_logs.company_id
            AND w.visible_after <= now()
        )
      )
    $policy$;
  END IF;

  IF to_regclass('public.notifications') IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'notifications'
        AND column_name = 'related_wire_id'
    )
    AND NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'notifications'
        AND policyname = 'Inbound quarantine restricts wire notification reads'
    ) THEN
    EXECUTE $policy$
      CREATE POLICY "Inbound quarantine restricts wire notification reads"
      ON public.notifications
      AS RESTRICTIVE
      FOR SELECT
      TO authenticated
      USING (
        COALESCE(public.current_auth_user_role(), '') NOT IN ('cfo', 'controller')
        OR related_wire_id IS NULL
        OR EXISTS (
          SELECT 1
          FROM public.wire_requests AS w
          WHERE w.id = notifications.related_wire_id
            AND w.company_id = notifications.company_id
            AND w.visible_after <= now()
        )
      )
    $policy$;
  END IF;

  IF to_regclass('public.investigations') IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'investigations' AND column_name = 'wire_id'
    )
    AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'investigations' AND column_name = 'company_id'
    )
    AND NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'investigations'
        AND policyname = 'Inbound quarantine restricts investigation reads'
    ) THEN
    EXECUTE $policy$
      CREATE POLICY "Inbound quarantine restricts investigation reads"
      ON public.investigations
      AS RESTRICTIVE
      FOR SELECT
      TO authenticated
      USING (
        COALESCE(public.current_auth_user_role(), '') NOT IN ('cfo', 'controller')
        OR wire_id IS NULL
        OR EXISTS (
          SELECT 1
          FROM public.wire_requests AS w
          WHERE w.id = investigations.wire_id
            AND w.company_id = investigations.company_id
            AND w.visible_after <= now()
        )
      )
    $policy$;
  END IF;

  IF to_regclass('public.investigation_notes') IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'investigation_notes' AND column_name = 'investigation_id'
    )
    AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'investigations' AND column_name = 'wire_id'
    )
    AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'investigations' AND column_name = 'company_id'
    )
    AND NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'investigation_notes'
        AND policyname = 'Inbound quarantine restricts investigation note reads'
    ) THEN
    EXECUTE $policy$
      CREATE POLICY "Inbound quarantine restricts investigation note reads"
      ON public.investigation_notes
      AS RESTRICTIVE
      FOR SELECT
      TO authenticated
      USING (
        COALESCE(public.current_auth_user_role(), '') NOT IN ('cfo', 'controller')
        OR EXISTS (
          SELECT 1
          FROM public.investigations AS i
          WHERE i.id = investigation_notes.investigation_id
            AND (
              i.wire_id IS NULL
              OR EXISTS (
                SELECT 1
                FROM public.wire_requests AS w
                WHERE w.id = i.wire_id
                  AND w.company_id = i.company_id
                  AND w.visible_after <= now()
              )
            )
        )
      )
    $policy$;
  END IF;

  IF to_regclass('public.vendor_callback_verifications') IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'vendor_callback_verifications' AND column_name = 'wire_id'
    )
    AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'vendor_callback_verifications' AND column_name = 'company_id'
    ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'vendor_callback_verifications'
        AND policyname = 'Inbound quarantine restricts callback reads'
    ) THEN
      EXECUTE $policy$
        CREATE POLICY "Inbound quarantine restricts callback reads"
        ON public.vendor_callback_verifications
        AS RESTRICTIVE
        FOR SELECT
        TO authenticated
        USING (
          COALESCE(public.current_auth_user_role(), '') NOT IN ('cfo', 'controller')
          OR wire_id IS NULL
          OR EXISTS (
            SELECT 1
            FROM public.wire_requests AS w
            WHERE w.id = vendor_callback_verifications.wire_id
              AND w.company_id = vendor_callback_verifications.company_id
              AND w.visible_after <= now()
          )
        )
      $policy$;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'vendor_callback_verifications'
        AND policyname = 'Inbound quarantine restricts callback inserts'
    ) THEN
      EXECUTE $policy$
        CREATE POLICY "Inbound quarantine restricts callback inserts"
        ON public.vendor_callback_verifications
        AS RESTRICTIVE
        FOR INSERT
        TO authenticated
        WITH CHECK (
          COALESCE(public.current_auth_user_role(), '') NOT IN ('cfo', 'controller')
          OR wire_id IS NULL
          OR EXISTS (
            SELECT 1
            FROM public.wire_requests AS w
            WHERE w.id = vendor_callback_verifications.wire_id
              AND w.company_id = vendor_callback_verifications.company_id
              AND w.visible_after <= now()
          )
        )
      $policy$;
    END IF;
  END IF;

  IF to_regclass('public.investigation_notes') IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'investigation_notes' AND column_name = 'investigation_id'
    )
    AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'investigations' AND column_name = 'wire_id'
    )
    AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'investigations' AND column_name = 'company_id'
    )
    AND NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'investigation_notes'
        AND policyname = 'Inbound quarantine restricts investigation note inserts'
    ) THEN
    EXECUTE $policy$
      CREATE POLICY "Inbound quarantine restricts investigation note inserts"
      ON public.investigation_notes
      AS RESTRICTIVE
      FOR INSERT
      TO authenticated
      WITH CHECK (
        COALESCE(public.current_auth_user_role(), '') NOT IN ('cfo', 'controller')
        OR EXISTS (
          SELECT 1
          FROM public.investigations AS i
          WHERE i.id = investigation_notes.investigation_id
            AND (
              i.wire_id IS NULL
              OR EXISTS (
                SELECT 1
                FROM public.wire_requests AS w
                WHERE w.id = i.wire_id
                  AND w.company_id = i.company_id
                  AND w.visible_after <= now()
              )
            )
        )
      )
    $policy$;
  END IF;

  IF to_regclass('storage.objects') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'storage'
        AND tablename = 'objects'
        AND policyname = 'Inbound quarantine restricts invoice reads'
    ) THEN
    EXECUTE $policy$
      CREATE POLICY "Inbound quarantine restricts invoice reads"
      ON storage.objects
      AS RESTRICTIVE
      FOR SELECT
      TO authenticated
      USING (
        bucket_id <> 'invoices'
        OR NOT public.is_wire_invoice_quarantined(name)
      )
    $policy$;
  END IF;
END;
$$;
