-- supabase-update-73.sql
-- Adds folder_type to template/job folders, adds template_tasks and job_tasks tables

-- 1. Add folder_type to template_folders ('document' | 'photo_video')
ALTER TABLE template_folders ADD COLUMN IF NOT EXISTS folder_type TEXT NOT NULL DEFAULT 'document';

-- 2. Add folder_type to job_folders
ALTER TABLE job_folders ADD COLUMN IF NOT EXISTS folder_type TEXT NOT NULL DEFAULT 'document';

-- 3. Template Tasks (tasks defined in a template)
CREATE TABLE IF NOT EXISTS template_tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES job_templates(id) ON DELETE CASCADE,
  task_name   TEXT NOT NULL,
  sort_order  INT  DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Job Tasks (tasks on a job, from template or added manually)
CREATE TABLE IF NOT EXISTS job_tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id      UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  task_name   TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'completed'
  template_id UUID REFERENCES job_templates(id) ON DELETE SET NULL,
  sort_order  INT  DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Indexes
CREATE INDEX IF NOT EXISTS template_tasks_template_idx ON template_tasks(template_id);
CREATE INDEX IF NOT EXISTS job_tasks_job_id_idx        ON job_tasks(job_id);
CREATE INDEX IF NOT EXISTS job_folders_type_idx        ON job_folders(folder_type);

-- 6. RLS — template_tasks
ALTER TABLE template_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "template_tasks_select" ON template_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "template_tasks_insert" ON template_tasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "template_tasks_update" ON template_tasks FOR UPDATE TO authenticated USING (true);
CREATE POLICY "template_tasks_delete" ON template_tasks FOR DELETE TO authenticated USING (true);

-- 7. RLS — job_tasks
ALTER TABLE job_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "job_tasks_select" ON job_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "job_tasks_insert" ON job_tasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "job_tasks_update" ON job_tasks FOR UPDATE TO authenticated USING (true);
CREATE POLICY "job_tasks_delete" ON job_tasks FOR DELETE TO authenticated USING (true);
