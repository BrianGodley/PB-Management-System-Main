-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-statistic-shares.sql  (corrected v2)
-- Phase 1: statistic_shares table + can_view/can_edit helper functions.
--
-- v2 changes vs v1:
--   • Removed the position-ownership branch from the helper functions —
--     employees has no position_id column to join on, so the original
--     branch threw "column user_id does not exist" when Postgres tried to
--     resolve the join. Position ownership is still stored on statistics
--     as metadata (owner_position_id), but permission checks now only
--     consider: admin override, user-owner, and explicit shares.
--   • DROP-then-CREATE so any half-applied state from the v1 attempt is
--     cleaned out before re-applying. Safe to re-run.
--
-- This migration ONLY adds the new table + its own RLS + helper functions.
-- The existing statistics table policies are NOT changed yet.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 0. Drop any prior attempt so this is reliably re-runnable ───────────────
DROP POLICY  IF EXISTS "Shares: owners and admins manage" ON public.statistic_shares;
DROP POLICY  IF EXISTS "Shares: sharee can read own row"  ON public.statistic_shares;
DROP TABLE   IF EXISTS public.statistic_shares CASCADE;
DROP FUNCTION IF EXISTS public.can_view_statistic(INTEGER);
DROP FUNCTION IF EXISTS public.can_edit_statistic(INTEGER);

-- ── 1. Table ─────────────────────────────────────────────────────────────────
CREATE TABLE public.statistic_shares (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  statistic_id INTEGER     NOT NULL REFERENCES public.statistics(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES auth.users(id)        ON DELETE CASCADE,
  permission   TEXT        NOT NULL CHECK (permission IN ('view', 'edit')),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  created_by   UUID        REFERENCES auth.users(id),
  UNIQUE (statistic_id, user_id)
);

CREATE INDEX statistic_shares_user_idx ON public.statistic_shares (user_id);
CREATE INDEX statistic_shares_stat_idx ON public.statistic_shares (statistic_id);

-- ── 2. Helper functions ─────────────────────────────────────────────────────
-- Rules: admin override, user owner, or explicit row in statistic_shares.
-- (Position-based ownership is metadata only — see header comment.)
CREATE FUNCTION public.can_view_statistic(p_stat_id INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.profiles
     WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ) THEN
    RETURN TRUE;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.statistics
     WHERE statistics.id = p_stat_id
       AND statistics.owner_user_id = auth.uid()
  ) THEN
    RETURN TRUE;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.statistic_shares
     WHERE statistic_shares.statistic_id = p_stat_id
       AND statistic_shares.user_id      = auth.uid()
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

CREATE FUNCTION public.can_edit_statistic(p_stat_id INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.profiles
     WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ) THEN
    RETURN TRUE;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.statistics
     WHERE statistics.id = p_stat_id
       AND statistics.owner_user_id = auth.uid()
  ) THEN
    RETURN TRUE;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.statistic_shares
     WHERE statistic_shares.statistic_id = p_stat_id
       AND statistic_shares.user_id      = auth.uid()
       AND statistic_shares.permission   = 'edit'
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_view_statistic(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_edit_statistic(INTEGER) TO authenticated;

-- ── 3. RLS for statistic_shares ─────────────────────────────────────────────
ALTER TABLE public.statistic_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shares: owners and admins manage" ON public.statistic_shares
  FOR ALL
  USING      (public.can_edit_statistic(statistic_id))
  WITH CHECK (public.can_edit_statistic(statistic_id));

CREATE POLICY "Shares: sharee can read own row" ON public.statistic_shares
  FOR SELECT
  USING (statistic_shares.user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.statistic_shares TO authenticated;
