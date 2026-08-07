-- ════════════════════════════════════════════════════════════════════════════
-- Fix: RLS policies for the LMS library tables.
-- Symptom: "new row violates row-level security policy for table lms_categories"
-- Cause: RLS is enabled on the library tables but no policies were defined, so
--        all writes (incl. admins) were denied. This adds: read for any signed-in
--        user; insert/update/delete for admins only. Idempotent — safe to re-run.
-- ════════════════════════════════════════════════════════════════════════════
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['lms_categories','lms_videos','lms_read_items'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t||'_read', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t||'_ins',  t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t||'_upd',  t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t||'_del',  t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true)', t||'_read', t);
    EXECUTE format($p$CREATE POLICY %I ON public.%I FOR INSERT TO authenticated
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role IN ('admin','super_admin')))$p$, t||'_ins', t);
    EXECUTE format($p$CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role IN ('admin','super_admin')))$p$, t||'_upd', t);
    EXECUTE format($p$CREATE POLICY %I ON public.%I FOR DELETE TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role IN ('admin','super_admin')))$p$, t||'_del', t);
  END LOOP;
END $$;
