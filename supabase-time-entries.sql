-- ─────────────────────────────────────────────────────────────────────────────
-- Time Entries — employee punch-in / punch-out records
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS time_entries (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id        uuid        REFERENCES jobs(id) ON DELETE SET NULL,
  employee_name text        NOT NULL,
  date          date        NOT NULL DEFAULT CURRENT_DATE,
  time_in       time        NOT NULL,
  time_out      time,
  notes         text,
  created_by    uuid        REFERENCES auth.users(id),
  source        text        DEFAULT 'manual',   -- 'manual' | 'clock_in' | 'mobile'
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS time_entries_job_id_idx   ON time_entries(job_id);
CREATE INDEX IF NOT EXISTS time_entries_date_idx      ON time_entries(date DESC);
CREATE INDEX IF NOT EXISTS time_entries_employee_idx  ON time_entries(employee_name);

-- RLS
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated full access"
  ON time_entries FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
