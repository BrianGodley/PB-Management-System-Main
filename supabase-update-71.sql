-- supabase-update-71.sql
-- Create job_files table for storing documents/photos linked to jobs
-- Storage bucket must be created manually in Supabase dashboard (see note below)

-- 1. Create job_files table
CREATE TABLE IF NOT EXISTS job_files (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id            UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  file_name         TEXT NOT NULL,
  file_type         TEXT,                        -- e.g. 'image/jpeg', 'application/pdf'
  file_category     TEXT DEFAULT 'document',     -- 'photo', 'document', 'plan', 'invoice', etc.
  storage_path      TEXT NOT NULL,               -- path within the Supabase Storage bucket
  file_size         BIGINT,                      -- bytes
  source            TEXT DEFAULT 'manual',       -- 'buildertrend' | 'manual'
  buildertrend_job  TEXT,                        -- original BT job name/number for traceability
  notes             TEXT,
  uploaded_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  uploaded_at       TIMESTAMPTZ DEFAULT NOW(),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Indexes for fast lookup by job
CREATE INDEX IF NOT EXISTS job_files_job_id_idx       ON job_files(job_id);
CREATE INDEX IF NOT EXISTS job_files_source_idx        ON job_files(source);
CREATE INDEX IF NOT EXISTS job_files_file_category_idx ON job_files(file_category);

-- 3. Enable Row Level Security
ALTER TABLE job_files ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies — authenticated users can read/write
CREATE POLICY "job_files_select" ON job_files
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "job_files_insert" ON job_files
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "job_files_update" ON job_files
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "job_files_delete" ON job_files
  FOR DELETE TO authenticated USING (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- IMPORTANT: After running this SQL, create the storage bucket manually:
--   1. Go to Supabase Dashboard → Storage
--   2. Click "New Bucket"
--   3. Name it exactly:  job-files
--   4. Set to Private (NOT public) — signed URLs will be used for access
--   5. Click Create
-- ─────────────────────────────────────────────────────────────────────────────
