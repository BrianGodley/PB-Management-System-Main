-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-fix-v4.sql
-- Fixes infinite recursion between statistics ↔ statistic_shares RLS policies.
-- Run in Supabase SQL Editor → New Query → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- The cycle:
--   statistics_select  → queries statistic_shares (with RLS)
--   statistic_shares_select → queries statistics (with RLS)  ← LOOP!
--
-- Fix: rewrite statistic_shares_select to use ONLY direct column comparisons
-- (no subquery back into statistics).

DROP POLICY IF EXISTS "statistic_shares_select" ON statistic_shares;
DROP POLICY IF EXISTS "statistic_shares_admin_all" ON statistic_shares;

-- Simple policy: you can see a share if you're the recipient or the sharer
CREATE POLICY "statistic_shares_select" ON statistic_shares FOR SELECT
  USING (
    shared_with_user_id = auth.uid()
    OR shared_by = auth.uid()
  );

-- Admin bypass (is_admin only queries profiles, no loop)
CREATE POLICY "statistic_shares_admin_all" ON statistic_shares
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Reload PostgREST cache
NOTIFY pgrst, 'reload schema';

-- Verify: should return a count, not an error
SELECT COUNT(*) AS statistics_count FROM statistics;
