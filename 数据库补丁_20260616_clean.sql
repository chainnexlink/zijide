/* DB patch 2026-06-16 (ASCII-safe). A) fix announcements.type CHECK mismatch. B) add admin RLS to tables created after admin_auth. Idempotent. Prereq: 20260529_admin_auth.sql (is_admin) and patch 20260610. */

DO $$
DECLARE c text;
BEGIN
  FOR c IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace ns ON ns.oid = rel.relnamespace
    WHERE ns.nspname = 'public' AND rel.relname = 'announcements'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%type%'
  LOOP
    EXECUTE format('ALTER TABLE public.announcements DROP CONSTRAINT %I', c);
  END LOOP;
  ALTER TABLE public.announcements
    ADD CONSTRAINT announcements_type_check
    CHECK (type IN ('info','warning','critical','update','reward','promotion'));
END $$;

DO $$
DECLARE
  t text;
  tbls text[] := ARRAY['shelter_reports','favorite_shelters','user_points','point_transactions'];
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'is_admin'
  ) THEN
    RAISE NOTICE 'public.is_admin() missing - run 20260529_admin_auth.sql first';
  ELSE
    FOREACH t IN ARRAY tbls LOOP
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t) THEN
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'admin full access '||t, t);
        EXECUTE format(
          'CREATE POLICY %I ON public.%I FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()))',
          'admin full access '||t, t
        );
      END IF;
    END LOOP;
  END IF;
END $$;
