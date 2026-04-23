-- Create schedule_items table for job scheduling calendar
CREATE TABLE IF NOT EXISTS schedule_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id        uuid REFERENCES jobs(id) ON DELETE CASCADE,
  title         text NOT NULL,
  display_color text NOT NULL DEFAULT '#15803d',
  assignees     text,
  start_date    date NOT NULL,
  end_date      date NOT NULL,
  work_days     integer,
  progress      integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  reminder      text,
  notes         text,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- Index for fast per-job and date-range queries
CREATE INDEX IF NOT EXISTS schedule_items_job_id_idx   ON schedule_items(job_id);
CREATE INDEX IF NOT EXISTS schedule_items_start_date_idx ON schedule_items(start_date);
CREATE INDEX IF NOT EXISTS schedule_items_end_date_idx   ON schedule_items(end_date);

-- RLS: allow authenticated users full access
ALTER TABLE schedule_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated"
  ON schedule_items
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
