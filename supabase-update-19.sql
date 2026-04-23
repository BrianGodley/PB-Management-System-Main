-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-update-19.sql
-- Per-user advanced permissions
--   • user_permissions table — one row per user, all flags
--   • Auto-created for every existing user (and new users via trigger)
--   • Admins bypass all permission checks (is_admin() = true → full access)
--   • RLS: admins read/write all rows; users read only their own
-- Run after supabase-update-18.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. user_permissions table
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_permissions (
  user_id   UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,

  -- ── Statistics ──────────────────────────────────────────────────────────
  can_create_stats      BOOLEAN NOT NULL DEFAULT TRUE,
  can_share_stats       BOOLEAN NOT NULL DEFAULT FALSE,
  can_make_stats_public BOOLEAN NOT NULL DEFAULT FALSE,

  -- ── Financial visibility ─────────────────────────────────────────────────
  can_view_financials   BOOLEAN NOT NULL DEFAULT TRUE,
  can_view_reports      BOOLEAN NOT NULL DEFAULT FALSE,

  -- ── Jobs & Bids ──────────────────────────────────────────────────────────
  can_create_jobs       BOOLEAN NOT NULL DEFAULT TRUE,
  can_edit_jobs         BOOLEAN NOT NULL DEFAULT TRUE,
  can_delete_jobs       BOOLEAN NOT NULL DEFAULT FALSE,
  can_create_bids       BOOLEAN NOT NULL DEFAULT TRUE,
  can_edit_bids         BOOLEAN NOT NULL DEFAULT TRUE,

  -- ── Module access ────────────────────────────────────────────────────────
  access_tracker        BOOLEAN NOT NULL DEFAULT TRUE,
  access_master_rates   BOOLEAN NOT NULL DEFAULT FALSE,
  access_admin          BOOLEAN NOT NULL DEFAULT FALSE,
  access_collections    BOOLEAN NOT NULL DEFAULT TRUE,
  access_statistics     BOOLEAN NOT NULL DEFAULT TRUE,

  -- ── Audit ────────────────────────────────────────────────────────────────
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_by  UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Back-fill: create a default permissions row for every existing profile
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO user_permissions (user_id)
SELECT id FROM profiles
ON CONFLICT (user_id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Trigger: auto-create permissions row when a new profile is inserted
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION handle_new_profile()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO user_permissions (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created ON profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_new_profile();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. RLS
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "perms_admin_all"    ON user_permissions;
DROP POLICY IF EXISTS "perms_select_own"   ON user_permissions;
DROP POLICY IF EXISTS "perms_update_admin" ON user_permissions;

-- Admins: full access
CREATE POLICY "perms_admin_all" ON user_permissions
  FOR ALL USING (is_admin());

-- Users: can read their own permissions (so the app can enforce them client-side)
CREATE POLICY "perms_select_own" ON user_permissions
  FOR SELECT USING (auth.uid() = user_id);
