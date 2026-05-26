-- ─────────────────────────────────────────────────────────────────────────
-- time_entries — add GPS capture + off-site flagging for clock in/out
--
-- Adds lat/lon/accuracy and on_site/no_gps/override flags for both the
-- clock-in and clock-out events. On-site is determined client-side by
-- comparing the captured GPS to jobs.lat / jobs.lon (added in
-- supabase-schedule-assistant-phase1.sql) within a configurable radius
-- (1/4 mile = 402 m at time of writing).
--
-- Off-site clock-ins are warned-but-allowed: the entry is recorded with
-- on_site=false and override=true so supervisors can review later.
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE time_entries
  -- Clock-in GPS
  ADD COLUMN IF NOT EXISTS clock_in_lat         NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS clock_in_lon         NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS clock_in_accuracy_m  NUMERIC(8,2),   -- GPS reported accuracy (radius, in meters)
  ADD COLUMN IF NOT EXISTS clock_in_distance_m  NUMERIC(10,2),  -- distance from job site, in meters
  ADD COLUMN IF NOT EXISTS clock_in_on_site     BOOLEAN,        -- true=within radius, false=off-site, null=couldn't compare
  ADD COLUMN IF NOT EXISTS clock_in_no_gps      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS clock_in_override    BOOLEAN NOT NULL DEFAULT false, -- user confirmed off-site clock-in
  -- Clock-out GPS
  ADD COLUMN IF NOT EXISTS clock_out_lat        NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS clock_out_lon        NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS clock_out_accuracy_m NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS clock_out_distance_m NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS clock_out_on_site    BOOLEAN,
  ADD COLUMN IF NOT EXISTS clock_out_no_gps     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS clock_out_override   BOOLEAN NOT NULL DEFAULT false;

-- Partial index so the "needs review" supervisor view stays fast as the
-- table grows; only rows that are off-site, no-GPS, or override get indexed.
CREATE INDEX IF NOT EXISTS time_entries_needs_review_idx
  ON time_entries(date DESC, employee_name)
  WHERE clock_in_on_site IS FALSE
     OR clock_out_on_site IS FALSE
     OR clock_in_no_gps   IS TRUE
     OR clock_out_no_gps  IS TRUE
     OR clock_in_override IS TRUE
     OR clock_out_override IS TRUE;
