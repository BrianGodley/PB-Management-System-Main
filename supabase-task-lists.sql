-- ============================================================
-- Task Lists: categories + descriptions, plus job_tasks columns
-- ============================================================

BEGIN;

-- 1. Task Categories — predefined list shown in the first task column
CREATE TABLE IF NOT EXISTS task_categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE,
  sort_order INT  DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Task Descriptions — predefined list shown as autocomplete suggestions
--    (users can also type custom descriptions on the row)
CREATE TABLE IF NOT EXISTS task_descriptions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE,
  sort_order INT  DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Extend job_tasks with the new columns
ALTER TABLE job_tasks
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES task_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assignee_id UUID REFERENCES employees(id)       ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS due_date    DATE;

CREATE INDEX IF NOT EXISTS job_tasks_category_idx ON job_tasks(category_id);
CREATE INDEX IF NOT EXISTS job_tasks_assignee_idx ON job_tasks(assignee_id);
CREATE INDEX IF NOT EXISTS job_tasks_due_date_idx ON job_tasks(due_date);

-- 4. RLS
ALTER TABLE task_categories   ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_descriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_categories_all"
  ON task_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "task_descriptions_all"
  ON task_descriptions FOR ALL TO authenticated USING (true) WITH CHECK (true);

COMMIT;
