-- ============================================================
-- Schedule Assistant Phase 2A — start locations
-- Saved start addresses for the route optimizer (e.g. "Main Office",
-- "North Yard", "John's Truck"). Stored as jsonb on company_settings.
-- Shape per entry:
--   { id: uuid, label: text, address: text, lat: numeric, lon: numeric }
-- ============================================================

ALTER TABLE company_settings
  ADD COLUMN IF NOT EXISTS start_locations            JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS default_start_location_id  TEXT;
