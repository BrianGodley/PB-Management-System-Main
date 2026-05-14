-- ============================================================
-- BT todo enrichment fields on job_tasks
-- ============================================================
ALTER TABLE job_tasks
  ADD COLUMN IF NOT EXISTS bt_todo_id          BIGINT,
  ADD COLUMN IF NOT EXISTS priority            TEXT,
  ADD COLUMN IF NOT EXISTS notes               TEXT,
  ADD COLUMN IF NOT EXISTS completed_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_by_name   TEXT,
  ADD COLUMN IF NOT EXISTS assignee_name       TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS job_tasks_bt_todo_id_idx
  ON job_tasks(bt_todo_id) WHERE bt_todo_id IS NOT NULL;
