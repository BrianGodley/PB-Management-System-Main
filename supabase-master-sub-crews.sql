-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-master-sub-crews.sql
-- Creates the master_sub_crews table for the Subcontractor Crews tab
-- in Master Crews. Standalone list — not linked to subs_vendors.
-- Run once in the Supabase SQL Editor.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS master_sub_crews (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,               -- company name
  divisions  TEXT[]      NOT NULL DEFAULT '{}',  -- trade areas
  rating     INTEGER     CHECK (rating BETWEEN 1 AND 10),
  notes      TEXT        DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: allow authenticated users to read and write
ALTER TABLE master_sub_crews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "master_sub_crews_select" ON master_sub_crews FOR SELECT TO authenticated USING (true);
CREATE POLICY "master_sub_crews_insert" ON master_sub_crews FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "master_sub_crews_update" ON master_sub_crews FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "master_sub_crews_delete" ON master_sub_crews FOR DELETE TO authenticated USING (true);
