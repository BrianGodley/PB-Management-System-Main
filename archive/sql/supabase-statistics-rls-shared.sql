-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-statistics-rls-shared.sql  (v3 — drops dependent policies first)
--
-- v2 failed because the existing "Shares: owners and admins manage" policy on
-- statistic_shares depends on the old can_edit_statistic(integer) helper, so
-- the DROP FUNCTION raised a dependency error. v3 drops every policy that
-- references the helpers BEFORE dropping the functions, then recreates the
-- helpers (with BIGINT) and every policy in the right order.
--
-- Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Drop every policy that depends on the helpers ────────────────────────
-- statistic_shares
DROP POLICY IF EXISTS "Shares: owners and admins manage" ON public.statistic_shares;
DROP POLICY IF EXISTS "Shares: sharee can read own row"  ON public.statistic_shares;
DROP POLICY IF EXISTS "statistic_shares_owners_and_admins_manage" ON public.statistic_shares;
DROP POLICY IF EXISTS "statistic_shares_sharee_can_read_own_row"  ON public.statistic_shares;

-- statistics
DROP POLICY IF EXISTS "statistics_admin_all" ON public.statistics;
DROP POLICY IF EXISTS "statistics_select"    ON public.statistics;
DROP POLICY IF EXISTS "statistics_insert"    ON public.statistics;
DROP POLICY IF EXISTS "statistics_update"    ON public.statistics;
DROP POLICY IF EXISTS "statistics_delete"    ON public.statistics;

-- statistic_values
DROP POLICY IF EXISTS "statistic_values_admin_all" ON public.statistic_values;
DROP POLICY IF EXISTS "statistic_values_select"    ON public.statistic_values;
DROP POLICY IF EXISTS "statistic_values_insert"    ON public.statistic_values;
DROP POLICY IF EXISTS "statistic_values_update"    ON public.statistic_values;
DROP POLICY IF EXISTS "statistic_values_delete"    ON public.statistic_values;

-- ── 2. Drop the helpers (any signature) ─────────────────────────────────────
DROP FUNCTION IF EXISTS public.can_view_statistic(INTEGER);
DROP FUNCTION IF EXISTS public.can_view_statistic(BIGINT);
DROP FUNCTION IF EXISTS public.can_edit_statistic(INTEGER);
DROP FUNCTION IF EXISTS public.can_edit_statistic(BIGINT);

-- ── 3. Recreate helpers with BIGINT param ───────────────────────────────────
CREATE FUNCTION public.can_view_statistic(p_stat_id BIGINT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public
AS $$
BEGIN
  -- Admin override
  IF EXISTS (SELECT 1 FROM public.profiles
              WHERE id = auth.uid() AND role IN ('admin','super_admin')) THEN
    RETURN TRUE;
  END IF;
  -- Owner
  IF EXISTS (SELECT 1 FROM public.statistics
              WHERE id = p_stat_id AND owner_user_id = auth.uid()) THEN
    RETURN TRUE;
  END IF;
  -- Explicit share row
  IF EXISTS (SELECT 1 FROM public.statistic_shares
              WHERE statistic_id = p_stat_id AND user_id = auth.uid()) THEN
    RETURN TRUE;
  END IF;
  RETURN FALSE;
END;
$$;

CREATE FUNCTION public.can_edit_statistic(p_stat_id BIGINT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles
              WHERE id = auth.uid() AND role IN ('admin','super_admin')) THEN
    RETURN TRUE;
  END IF;
  IF EXISTS (SELECT 1 FROM public.statistics
              WHERE id = p_stat_id AND owner_user_id = auth.uid()) THEN
    RETURN TRUE;
  END IF;
  IF EXISTS (SELECT 1 FROM public.statistic_shares
              WHERE statistic_id = p_stat_id
                AND user_id      = auth.uid()
                AND permission   = 'edit') THEN
    RETURN TRUE;
  END IF;
  RETURN FALSE;
END;
$$;

-- ── 4. Recreate statistic_shares policies (depend on can_edit_statistic) ────
-- Owners + admins fully manage rows for stats they own.
CREATE POLICY "Shares: owners and admins manage" ON public.statistic_shares
  FOR ALL TO authenticated
  USING (public.can_edit_statistic(statistic_id))
  WITH CHECK (public.can_edit_statistic(statistic_id));

-- A sharee can always read their own share rows (so the app can show what's
-- shared with them even if can_view_statistic somehow returned false).
CREATE POLICY "Shares: sharee can read own row" ON public.statistic_shares
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

ALTER TABLE public.statistic_shares ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.statistic_shares TO authenticated;

-- ── 5. statistics policies ─────────────────────────────────────────────────
CREATE POLICY "statistics_select" ON public.statistics
  FOR SELECT TO authenticated
  USING (public.can_view_statistic(id));

CREATE POLICY "statistics_insert" ON public.statistics
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = owner_user_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
  );

CREATE POLICY "statistics_update" ON public.statistics
  FOR UPDATE TO authenticated
  USING (public.can_edit_statistic(id))
  WITH CHECK (public.can_edit_statistic(id));

CREATE POLICY "statistics_delete" ON public.statistics
  FOR DELETE TO authenticated
  USING (
    auth.uid() = owner_user_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
  );

ALTER TABLE public.statistics ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.statistics TO authenticated;

-- ── 6. statistic_values policies ────────────────────────────────────────────
CREATE POLICY "statistic_values_select" ON public.statistic_values
  FOR SELECT TO authenticated
  USING (public.can_view_statistic(statistic_id));

CREATE POLICY "statistic_values_insert" ON public.statistic_values
  FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_statistic(statistic_id));

CREATE POLICY "statistic_values_update" ON public.statistic_values
  FOR UPDATE TO authenticated
  USING (public.can_edit_statistic(statistic_id))
  WITH CHECK (public.can_edit_statistic(statistic_id));

CREATE POLICY "statistic_values_delete" ON public.statistic_values
  FOR DELETE TO authenticated
  USING (public.can_edit_statistic(statistic_id));

ALTER TABLE public.statistic_values ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.statistic_values TO authenticated;
