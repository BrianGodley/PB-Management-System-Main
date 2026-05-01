-- supabase-update-69.sql
-- stat_groups: admin-defined named groups of statistics
--
-- Each row represents one group.  stat_ids stores an ordered array of
-- bigint IDs (matching statistics.id BIGSERIAL) belonging to that group.

CREATE TABLE IF NOT EXISTS stat_groups (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  stat_ids    BIGINT[] NOT NULL DEFAULT '{}',
  sort_order  INTEGER  NOT NULL DEFAULT 0,
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Row Level Security ───────────────────────────────────────────────────────

ALTER TABLE stat_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Auth select stat_groups" ON stat_groups;
CREATE POLICY "Auth select stat_groups"
  ON stat_groups FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Auth insert stat_groups" ON stat_groups;
CREATE POLICY "Auth insert stat_groups"
  ON stat_groups FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Auth update stat_groups" ON stat_groups;
CREATE POLICY "Auth update stat_groups"
  ON stat_groups FOR UPDATE
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Auth delete stat_groups" ON stat_groups;
CREATE POLICY "Auth delete stat_groups"
  ON stat_groups FOR DELETE
  USING (auth.role() = 'authenticated');
