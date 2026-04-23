-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-update-35.sql
-- Creates job_stages table, seeds the 12 default stages,
-- and adds stage_id to the jobs table.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS job_stages (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  sort_order INTEGER     NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE job_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_job_stages"
  ON job_stages FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

INSERT INTO job_stages (name, sort_order) VALUES
  ('Design',            1),
  ('Install Sales',     2),
  ('Project Prep',      3),
  ('Permits',           4),
  ('Final Prep Review', 5),
  ('Pre-Install',       6),
  ('Hold',              7),
  ('Job',               8),
  ('Yard Check',        9),
  ('Warranty',          10),
  ('Finance',           11),
  ('Send Gift',         12)
ON CONFLICT DO NOTHING;

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS stage_id UUID REFERENCES job_stages(id) ON DELETE SET NULL;
