-- ============================================================
-- Schedule Assistant — Phase 1 schema
-- - Cached lat/lon on jobs so we geocode each address only once
-- - Company-wide default total of yard checks per job
-- ============================================================

BEGIN;

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS lat              NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS lon              NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS geocoded_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS geocode_status   TEXT NOT NULL DEFAULT 'pending'
    CHECK (geocode_status IN ('pending','ok','not_found','error','skipped'));

CREATE INDEX IF NOT EXISTS jobs_geocode_status_idx ON jobs(geocode_status);
CREATE INDEX IF NOT EXISTS jobs_latlon_idx         ON jobs(lat, lon) WHERE lat IS NOT NULL;

ALTER TABLE company_settings
  ADD COLUMN IF NOT EXISTS yard_check_default_total INT NOT NULL DEFAULT 4;

COMMIT;
