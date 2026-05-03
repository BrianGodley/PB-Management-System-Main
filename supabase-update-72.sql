-- supabase-update-72.sql
-- Job Templates system: templates, folders per template, folders per job

-- 1. Job Templates
CREATE TABLE IF NOT EXISTS job_templates (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  project_manager  TEXT,
  consultant       TEXT,
  auto_trigger     TEXT DEFAULT NULL, -- 'sold_bid' | NULL
  notes            TEXT,
  created_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Folders defined within a template
CREATE TABLE IF NOT EXISTS template_folders (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id  UUID NOT NULL REFERENCES job_templates(id) ON DELETE CASCADE,
  folder_name  TEXT NOT NULL,
  sort_order   INT  DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Folders created on a job (from a template or manually)
CREATE TABLE IF NOT EXISTS job_folders (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id       UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  folder_name  TEXT NOT NULL,
  template_id  UUID REFERENCES job_templates(id) ON DELETE SET NULL,
  sort_order   INT  DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Add folder_id to job_files so files can live inside a folder
ALTER TABLE job_files ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES job_folders(id) ON DELETE SET NULL;

-- 5. Indexes
CREATE INDEX IF NOT EXISTS job_templates_auto_trigger_idx  ON job_templates(auto_trigger);
CREATE INDEX IF NOT EXISTS template_folders_template_idx   ON template_folders(template_id);
CREATE INDEX IF NOT EXISTS job_folders_job_id_idx          ON job_folders(job_id);
CREATE INDEX IF NOT EXISTS job_files_folder_id_idx         ON job_files(folder_id);

-- 6. RLS — job_templates
ALTER TABLE job_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "job_templates_select" ON job_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "job_templates_insert" ON job_templates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "job_templates_update" ON job_templates FOR UPDATE TO authenticated USING (true);
CREATE POLICY "job_templates_delete" ON job_templates FOR DELETE TO authenticated USING (true);

-- 7. RLS — template_folders
ALTER TABLE template_folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "template_folders_select" ON template_folders FOR SELECT TO authenticated USING (true);
CREATE POLICY "template_folders_insert" ON template_folders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "template_folders_update" ON template_folders FOR UPDATE TO authenticated USING (true);
CREATE POLICY "template_folders_delete" ON template_folders FOR DELETE TO authenticated USING (true);

-- 8. RLS — job_folders
ALTER TABLE job_folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "job_folders_select" ON job_folders FOR SELECT TO authenticated USING (true);
CREATE POLICY "job_folders_insert" ON job_folders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "job_folders_update" ON job_folders FOR UPDATE TO authenticated USING (true);
CREATE POLICY "job_folders_delete" ON job_folders FOR DELETE TO authenticated USING (true);
