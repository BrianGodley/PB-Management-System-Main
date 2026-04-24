-- supabase-update-44.sql
-- Replace single `name` field on master_equipment with `manufacturer` + `model`

ALTER TABLE master_equipment
  ADD COLUMN IF NOT EXISTS manufacturer TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS model        TEXT NOT NULL DEFAULT '';

-- Backfill: copy existing name into model so no data is lost
UPDATE master_equipment
  SET model = name
  WHERE model = '' AND name IS NOT NULL AND name <> '';
