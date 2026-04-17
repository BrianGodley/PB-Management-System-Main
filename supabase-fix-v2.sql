-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-fix-v2.sql  
-- Nuclear fix for the statistics 500 error.
-- Run in Supabase SQL Editor → New Query → Run All
-- ─────────────────────────────────────────────────────────────────────────────

-- Step 1: Completely turn off RLS so we can clean house
ALTER TABLE statistics DISABLE ROW LEVEL SECURITY;
ALTER TABLE statistic_values DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop every policy on statistics
DROP POLICY IF EXISTS "statistics_admin_all"  ON statistics;
DROP POLICY IF EXISTS "statistics_select"     ON statistics;
DROP POLICY IF EXISTS "statistics_insert"     ON statistics;
DROP POLICY IF EXISTS "statistics_update"     ON statistics;
DROP POLICY IF EXISTS "statistics_delete"     ON statistics;

-- Step 3: Drop every policy on statistic_values
DROP POLICY IF EXISTS "statistic_values_admin_all" ON statistic_values;
DROP POLICY IF EXISTS "statistic_values_select"    ON statistic_values;
DROP POLICY IF EXISTS "statistic_values_insert"    ON statistic_values;
DROP POLICY IF EXISTS "statistic_values_update"    ON statistic_values;
DROP POLICY IF EXISTS "statistic_values_delete"    ON statistic_values;

-- Step 4: Drop the is_admin function entirely (it may be broken)
DROP FUNCTION IF EXISTS is_admin();

-- Step 5: Ensure role column exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';

-- Step 6: Re-enable RLS
ALTER TABLE statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE statistic_values ENABLE ROW LEVEL SECURITY;

-- Step 7: Recreate statistics policies WITHOUT using is_admin()
CREATE POLICY "statistics_select" ON statistics FOR SELECT
  USING (
    auth.uid() = owner_user_id
    OR is_public = TRUE
    OR id IN (
      SELECT statistic_id FROM statistic_shares WHERE shared_with_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "statistics_insert" ON statistics FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "statistics_update" ON statistics FOR UPDATE
  USING (
    auth.uid() = owner_user_id
    OR auth.uid() = created_by
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "statistics_delete" ON statistics FOR DELETE
  USING (
    auth.uid() = owner_user_id
    OR auth.uid() = created_by
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Step 8: Recreate statistic_values policies WITHOUT using is_admin()
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
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "statistic_values_insert" ON statistic_values FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "statistic_values_update" ON statistic_values FOR UPDATE
  USING (entered_by = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "statistic_values_delete" ON statistic_values FOR DELETE
  USING (entered_by = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Step 9: Force PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';

-- Verify: this should return a number (even 0), not error
SELECT COUNT(*) AS statistics_count FROM statistics;
