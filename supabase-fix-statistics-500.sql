-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-fix-statistics-500.sql
-- Fixes the 500 Internal Server Error on the statistics table.
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New Query).
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Ensure the role column exists on profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';

-- Update check constraint safely
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'user'));

-- 2. Create/replace the is_admin() function
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- 3. Set the earliest user as admin if no admin exists
UPDATE profiles
SET role = 'admin'
WHERE id = (
  SELECT id FROM profiles ORDER BY created_at ASC LIMIT 1
)
AND NOT EXISTS (
  SELECT 1 FROM profiles WHERE role = 'admin'
);

-- 4. Drop ALL existing statistics RLS policies and recreate cleanly
DROP POLICY IF EXISTS "statistics_admin_all"  ON statistics;
DROP POLICY IF EXISTS "statistics_select"     ON statistics;
DROP POLICY IF EXISTS "statistics_insert"     ON statistics;
DROP POLICY IF EXISTS "statistics_update"     ON statistics;
DROP POLICY IF EXISTS "statistics_delete"     ON statistics;

-- Admin: full access
CREATE POLICY "statistics_admin_all" ON statistics
  FOR ALL USING (is_admin());

-- Regular users: see their own + public + shared
CREATE POLICY "statistics_select" ON statistics FOR SELECT
  USING (
    auth.uid() = owner_user_id
    OR is_public = TRUE
    OR id IN (
      SELECT statistic_id FROM statistic_shares WHERE shared_with_user_id = auth.uid()
    )
  );

-- Any authenticated user can insert
CREATE POLICY "statistics_insert" ON statistics FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Owner or creator can update
CREATE POLICY "statistics_update" ON statistics FOR UPDATE
  USING (auth.uid() = owner_user_id OR auth.uid() = created_by);

-- Owner or creator can delete
CREATE POLICY "statistics_delete" ON statistics FOR DELETE
  USING (auth.uid() = owner_user_id OR auth.uid() = created_by);

-- 5. Also fix statistic_values policies
DROP POLICY IF EXISTS "statistic_values_admin_all" ON statistic_values;
DROP POLICY IF EXISTS "statistic_values_select"    ON statistic_values;
DROP POLICY IF EXISTS "statistic_values_insert"    ON statistic_values;
DROP POLICY IF EXISTS "statistic_values_update"    ON statistic_values;
DROP POLICY IF EXISTS "statistic_values_delete"    ON statistic_values;

CREATE POLICY "statistic_values_admin_all" ON statistic_values
  FOR ALL USING (is_admin());

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

-- Done!
SELECT 'Fix applied successfully. Statistics table should now work.' AS result;
