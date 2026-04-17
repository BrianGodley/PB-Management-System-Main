-- ─────────────────────────────────────────────────────────────────────────────
-- Daily Logs — timestamped field entries with photos
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. daily_logs table
CREATE TABLE IF NOT EXISTS daily_logs (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id            uuid        REFERENCES jobs(id) ON DELETE CASCADE,
  date              date        NOT NULL DEFAULT CURRENT_DATE,
  title             text,
  notes             text,
  created_by        uuid        REFERENCES auth.users(id),
  permissions       text[]      NOT NULL DEFAULT ARRAY['internal'],
  weather_conditions boolean    DEFAULT false,
  weather_notes     text,
  source            text        DEFAULT 'web',   -- 'web' | 'mobile'
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

-- 2. daily_log_photos table
CREATE TABLE IF NOT EXISTS daily_log_photos (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id       uuid        NOT NULL REFERENCES daily_logs(id) ON DELETE CASCADE,
  storage_path text        NOT NULL,
  file_name    text,
  mime_type    text,
  created_at   timestamptz DEFAULT now()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS daily_logs_job_id_idx    ON daily_logs(job_id);
CREATE INDEX IF NOT EXISTS daily_logs_date_idx       ON daily_logs(date DESC);
CREATE INDEX IF NOT EXISTS daily_logs_created_by_idx ON daily_logs(created_by);
CREATE INDEX IF NOT EXISTS daily_log_photos_log_idx  ON daily_log_photos(log_id);

-- 4. RLS
ALTER TABLE daily_logs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_log_photos  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated full access" ON daily_logs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated full access" ON daily_log_photos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. Storage bucket for photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('daily-log-photos', 'daily-log-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated upload daily log photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'daily-log-photos');

CREATE POLICY "Public read daily log photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'daily-log-photos');

CREATE POLICY "Authenticated delete daily log photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'daily-log-photos');
