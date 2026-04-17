-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-update-16.sql
-- User roles, permissions, and admin RLS bypass
--   • Ensures profiles has role column (admin | user)
--   • Creates is_admin() helper function
--   • Adds admin-bypass policies to all statistics tables
--   • Adds admin-bypass to profiles (admins can update any profile)
--   • Sets the first/only user as admin if no admin exists yet
-- Run after supabase-update-15.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Ensure role column exists on profiles with correct default
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
  CHECK (role IN ('admin', 'user'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. is_admin() helper — used in all RLS policies
--    SECURITY DEFINER so it bypasses RLS on the profiles table itself
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Set the earliest-created user as admin if no admin exists yet
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE profiles
SET role = 'admin'
WHERE id = (
  SELECT id FROM profiles ORDER BY created_at ASC LIMIT 1
)
AND NOT EXISTS (
  SELECT 1 FROM profiles WHERE role = 'admin'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. PROFILES — admin can update any profile (change roles, names)
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "profiles_update_own"   ON profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON profiles;

-- Own profile: anyone can update their own
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Admin: can update any profile (to change roles)
CREATE POLICY "profiles_update_admin" ON profiles
  FOR UPDATE USING (is_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. STATISTICS — admin sees and manages all statistics
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "statistics_select"       ON statistics;
DROP POLICY IF EXISTS "statistics_insert"       ON statistics;
DROP POLICY IF EXISTS "statistics_update"       ON statistics;
DROP POLICY IF EXISTS "statistics_delete"       ON statistics;
DROP POLICY IF EXISTS "statistics_admin_all"    ON statistics;

-- Admins: full access to all rows
CREATE POLICY "statistics_admin_all" ON statistics
  FOR ALL USING (is_admin());

-- Regular users: own + shared + public
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

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. STATISTIC_VALUES — admin sees and manages all values
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "statistic_values_select"    ON statistic_values;
DROP POLICY IF EXISTS "statistic_values_insert"    ON statistic_values;
DROP POLICY IF EXISTS "statistic_values_update"    ON statistic_values;
DROP POLICY IF EXISTS "statistic_values_delete"    ON statistic_values;
DROP POLICY IF EXISTS "statistic_values_admin_all" ON statistic_values;

CREATE POLICY "statistic_values_admin_all" ON statistic_values
  FOR ALL USING (is_admin());

CREATE POLICY "statistic_values_select" ON statistic_values FOR SELECT
  USING (
    statistic_id IN (
      SELECT id FROM statistics
      WHERE
        owner_user_id = auth.uid()
        OR is_public = TRUE
        OR id IN (
          SELECT statistic_id FROM statistic_shares WHERE shared_with_user_id = auth.uid()
        )
    )
  );

CREATE POLICY "statistic_values_insert" ON statistic_values FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "statistic_values_update" ON statistic_values FOR UPDATE
  USING (entered_by = auth.uid());

CREATE POLICY "statistic_values_delete" ON statistic_values FOR DELETE
  USING (entered_by = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. STATISTIC_SHARES — admin can create/delete any share
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "statistic_shares_select"    ON statistic_shares;
DROP POLICY IF EXISTS "statistic_shares_insert"    ON statistic_shares;
DROP POLICY IF EXISTS "statistic_shares_delete"    ON statistic_shares;
DROP POLICY IF EXISTS "statistic_shares_admin_all" ON statistic_shares;

CREATE POLICY "statistic_shares_admin_all" ON statistic_shares
  FOR ALL USING (is_admin());

CREATE POLICY "statistic_shares_select" ON statistic_shares FOR SELECT
  USING (
    shared_with_user_id = auth.uid()
    OR statistic_id IN (
      SELECT id FROM statistics WHERE owner_user_id = auth.uid()
    )
  );

CREATE POLICY "statistic_shares_insert" ON statistic_shares FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "statistic_shares_delete" ON statistic_shares FOR DELETE
  USING (
    shared_by = auth.uid()
    OR statistic_id IN (
      SELECT id FROM statistics WHERE owner_user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. POSITIONS — admin can insert/update/delete
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "positions_select_all"   ON positions;
DROP POLICY IF EXISTS "positions_insert_auth"  ON positions;
DROP POLICY IF EXISTS "positions_admin_all"    ON positions;

CREATE POLICY "positions_admin_all" ON positions
  FOR ALL USING (is_admin());

CREATE POLICY "positions_select_all" ON positions
  FOR SELECT USING (auth.role() = 'authenticated');
