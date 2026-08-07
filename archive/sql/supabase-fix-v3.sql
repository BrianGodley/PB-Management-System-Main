-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-fix-v3.sql
-- Fixes the statistics 500 error without touching is_admin()
-- Run in Supabase SQL Editor → New Query → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- Step 1: Disable RLS temporarily
ALTER TABLE statistics DISABLE ROW LEVEL SECURITY;
ALTER TABLE statistic_values DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop only the statistics table policies
DROP POLICY IF EXISTS "statistics_admin_all"  ON statistics;
DROP POLICY IF EXISTS "statistics_select"     ON statistics;
DROP POLICY IF EXISTS "statistics_insert"     ON statistics;
DROP POLICY IF EXISTS "statistics_update"     ON statistics;
DROP POLICY IF EXISTS "statistics_delete"     ON statistics;

-- Step 3: Drop only the statistic_values policies
DROP POLICY IF EXISTS "statistic_values_admin_all" ON statistic_values;
DROP POLICY IF EXISTS "statistic_values_select"    ON statistic_values;
DROP POLICY IF EXISTS "statistic_values_insert"    ON statistic_values;
DROP POLICY IF EXISTS "statistic_values_update"    ON statistic_values;
DROP POLICY IF EXISTS "statistic_values_delete"    ON statistic_values;

-- Step 4: Re-enable RLS
ALTER TABLE statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE statistic_values ENABLE ROW LEVEL SECURITY;

-- Step 5: Recreate statistics policies (keeping is_admin() where it works)
CREATE POLICY "statistics_admin_all" ON statistics
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "statistics_select" ON statistics FOR SELECT
  USING (
    auth.uid() = owner_user_id
    OR is_public = TRUE
    OR id IN (
      SELECT statistic_id FROM statistic_shares WHERE shared_with_user_id = auth.uid()
    )
  );

CREATE POLICY "statistics_insert" ON statistics FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "statistics_update" ON statistics FOR UPDATE
  USING (auth.uid() = owner_user_id OR auth.uid() = created_by);

CREATE POLICY "statistics_delete" ON statistics FOR DELETE
  USING (auth.uid() = owner_user_id OR auth.uid() = created_by);

-- Step 6: Recreate statistic_values policies
CREATE POLICY "statistic_values_admin_all" ON statistic_values
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "statistic_values_select" ON statistic_values FOR SELECT
  USING (
    statistic_id IN (
      SELECT id FROM statistics
      WHERE owner_user_id = auth.uid()
        OR is_public = TRUE
        OR id IN (
          SELECT statistic_id FROM statistic_shares WHERE shared_with_user_id = auth.uid()
        )
    )
  );

CREATE POLICY "statistic_values_insert" ON statistic_values FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "statistic_values_update" ON statistic_values FOR UPDATE
  USING (entered_by = auth.uid() OR is_admin());

CREATE POLICY "statistic_values_delete" ON statistic_values FOR DELETE
  USING (entered_by = auth.uid() OR is_admin());

-- Step 7: Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Step 8: Verify — should return a row count (even 0), not an error
SELECT COUNT(*) AS statistics_count FROM statistics;
