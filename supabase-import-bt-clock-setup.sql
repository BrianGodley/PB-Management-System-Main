-- ============================================================
-- BuilderTrend time-clock import — SETUP  (run FIRST)
-- Source: v2_clock_time.csv  (62112 unique shifts after de-dup)
-- Then run batch 1..8, then the finalize script.
-- Safe to re-run: staging table is dropped/recreated; the import
-- itself de-dupes on bt_timecard_item_id.
-- ============================================================
BEGIN;

-- BuilderTrend provenance columns on the existing time-clock table.
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS bt_timecard_item_id bigint;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS bt_hours_regular    numeric;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS bt_hours_overtime   numeric;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS bt_break_time       numeric;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS bt_approval_status  text;

-- Unique key so the import is idempotent (ON CONFLICT DO NOTHING).
-- Existing manual entries keep bt_timecard_item_id NULL (NULLs are exempt).
CREATE UNIQUE INDEX IF NOT EXISTS time_entries_bt_timecard_idx
  ON time_entries (bt_timecard_item_id);

-- "Picture Build Internal" job — the home for General Time Clock entries
-- (BuilderTrend rows with no jobsite). Given the sentinel bt_job_id 0.
INSERT INTO jobs (bt_job_id, name, client_name, job_address,
                  job_city, job_state, job_zip, status, source)
VALUES (0, 'Picture Build Internal', 'Picture Build', '',
        '', '', '', 'active', 'buildertrend')
ON CONFLICT (bt_job_id) DO NOTHING;

-- Staging table for the raw clock rows.
DROP TABLE IF EXISTS _bt_clock_stg;
CREATE TABLE _bt_clock_stg (
  bt_timecard_item_id bigint PRIMARY KEY,
  bt_job_id           bigint,
  employee_name       text,
  clock_in_at         timestamp,
  clock_out_at        timestamp,
  notes               text,
  hours_regular       numeric,
  hours_overtime      numeric,
  break_time          numeric,
  approval_status     text
);

COMMIT;
