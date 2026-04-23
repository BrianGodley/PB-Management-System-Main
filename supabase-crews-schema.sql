-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-crews-schema.sql
-- Creates the crews table for Master Crews.
-- Run once in the Supabase SQL Editor.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS crews (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  label            TEXT        NOT NULL UNIQUE,          -- 'A' through 'Z'
  crew_chief_id    UUID        REFERENCES employees(id) ON DELETE SET NULL,
  journeyman_id    UUID        REFERENCES employees(id) ON DELETE SET NULL,
  laborer_1_id     UUID        REFERENCES employees(id) ON DELETE SET NULL,
  laborer_2_id     UUID        REFERENCES employees(id) ON DELETE SET NULL,
  laborer_3_id     UUID        REFERENCES employees(id) ON DELETE SET NULL,
  -- skills: [{ type: 'Masonry'|'Demo'|'Paver'|'Landscape', level: 1|2|3|4 }]
  skills           JSONB       NOT NULL DEFAULT '[]',
  notes            TEXT        DEFAULT '',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to keep updated_at current
CREATE OR REPLACE FUNCTION update_crews_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS crews_updated_at ON crews;
CREATE TRIGGER crews_updated_at
  BEFORE UPDATE ON crews
  FOR EACH ROW EXECUTE FUNCTION update_crews_updated_at();
