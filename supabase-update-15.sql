-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-update-15.sql
-- Statistics feature schema
-- ALL TABLES are created first, then ALL RLS policies are applied.
-- Run after supabase-update-14.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. PROFILES  (mirrors auth.users)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT,
  full_name   TEXT,
  role        TEXT DEFAULT 'user',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger: auto-create profile on new auth user
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Back-fill existing auth users
INSERT INTO profiles (id, email, full_name)
SELECT
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', email)
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. POSITIONS  (placeholder for future feature)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS positions (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. STATISTICS  (stat definitions)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS statistics (
  id                  BIGSERIAL PRIMARY KEY,
  name                TEXT NOT NULL,
  stat_type           TEXT NOT NULL CHECK (stat_type IN ('currency', 'numeric', 'percentage')),
  tracking            TEXT NOT NULL CHECK (tracking IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
  beginning_date      DATE NOT NULL,
  upside_down         BOOLEAN NOT NULL DEFAULT FALSE,
  owner_type          TEXT NOT NULL CHECK (owner_type IN ('user', 'position')),
  owner_user_id       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  owner_position_id   BIGINT REFERENCES positions(id) ON DELETE SET NULL,
  is_public           BOOLEAN NOT NULL DEFAULT FALSE,
  stat_category       TEXT DEFAULT 'General',
  created_by          UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- updated_at trigger
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS statistics_updated_at ON statistics;
CREATE TRIGGER statistics_updated_at
  BEFORE UPDATE ON statistics
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. STATISTIC_VALUES  (time-series data)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS statistic_values (
  id            BIGSERIAL PRIMARY KEY,
  statistic_id  BIGINT NOT NULL REFERENCES statistics(id) ON DELETE CASCADE,
  period_date   DATE   NOT NULL,
  value         NUMERIC(15, 4) NOT NULL,
  notes         TEXT,
  entered_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  entered_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (statistic_id, period_date)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. STATISTIC_SHARES  (shared stat access)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS statistic_shares (
  id                    BIGSERIAL PRIMARY KEY,
  statistic_id          BIGINT NOT NULL REFERENCES statistics(id) ON DELETE CASCADE,
  shared_with_user_id   UUID   NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  shared_by             UUID REFERENCES profiles(id) ON DELETE SET NULL,
  shared_at             TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (statistic_id, shared_with_user_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. RLS — enable on all tables
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE statistics        ENABLE ROW LEVEL SECURITY;
ALTER TABLE statistic_values  ENABLE ROW LEVEL SECURITY;
ALTER TABLE statistic_shares  ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. RLS POLICIES — profiles
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;

CREATE POLICY "profiles_select_all" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. RLS POLICIES — positions
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "positions_select_all"   ON positions;
DROP POLICY IF EXISTS "positions_insert_auth"  ON positions;

CREATE POLICY "positions_select_all" ON positions
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "positions_insert_auth" ON positions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. RLS POLICIES — statistics
-- (statistic_shares now exists so the subquery is safe)
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "statistics_select" ON statistics;
DROP POLICY IF EXISTS "statistics_insert" ON statistics;
DROP POLICY IF EXISTS "statistics_update" ON statistics;
DROP POLICY IF EXISTS "statistics_delete" ON statistics;

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
-- 10. RLS POLICIES — statistic_values
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "statistic_values_select" ON statistic_values;
DROP POLICY IF EXISTS "statistic_values_insert" ON statistic_values;
DROP POLICY IF EXISTS "statistic_values_update" ON statistic_values;
DROP POLICY IF EXISTS "statistic_values_delete" ON statistic_values;

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
-- 11. RLS POLICIES — statistic_shares
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "statistic_shares_select" ON statistic_shares;
DROP POLICY IF EXISTS "statistic_shares_insert" ON statistic_shares;
DROP POLICY IF EXISTS "statistic_shares_delete" ON statistic_shares;

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
