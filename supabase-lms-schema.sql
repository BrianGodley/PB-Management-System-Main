-- ─────────────────────────────────────────────────────────────────────────────
-- Learning Management System (LMS) Schema
-- Run this in the Supabase SQL Editor.
--
-- Tables:
--   lms_courses         — checksheet/course definitions
--   lms_steps           — ordered steps within a course
--   lms_assignments     — which employees are assigned to which courses
--   lms_step_completions — per-step completion records for each assignment
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Courses ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lms_courses (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  title       TEXT        NOT NULL,
  category    TEXT        NOT NULL DEFAULT 'General',
  description TEXT,
  is_active   BOOLEAN     DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Steps ─────────────────────────────────────────────────────────────────────
-- step_type: 'text' | 'checklist' | 'photo' | 'quiz'
CREATE TABLE IF NOT EXISTS lms_steps (
  id                 UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id          UUID    REFERENCES lms_courses(id) ON DELETE CASCADE,
  order_index        INTEGER NOT NULL DEFAULT 0,
  title              TEXT    NOT NULL,
  step_type          TEXT    NOT NULL DEFAULT 'text',
  content            TEXT,
  checklist_items    JSONB   DEFAULT '[]',   -- [{id, label}]
  quiz_question      TEXT,
  quiz_options       JSONB   DEFAULT '[]',   -- ['option a', 'option b', ...]
  quiz_correct_index INTEGER DEFAULT 0,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS lms_steps_course_id_idx ON lms_steps(course_id);
CREATE INDEX IF NOT EXISTS lms_steps_order_idx     ON lms_steps(course_id, order_index);

-- ── Assignments ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lms_assignments (
  id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id   UUID    REFERENCES lms_courses(id)  ON DELETE CASCADE,
  employee_id UUID    REFERENCES employees(id)     ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by TEXT,
  due_date    DATE,
  UNIQUE(course_id, employee_id)
);

CREATE INDEX IF NOT EXISTS lms_assignments_course_id_idx   ON lms_assignments(course_id);
CREATE INDEX IF NOT EXISTS lms_assignments_employee_id_idx ON lms_assignments(employee_id);

-- ── Step Completions ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lms_step_completions (
  id            UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID    REFERENCES lms_assignments(id) ON DELETE CASCADE,
  step_id       UUID    REFERENCES lms_steps(id)       ON DELETE CASCADE,
  completed_at  TIMESTAMPTZ DEFAULT NOW(),
  response_data JSONB   DEFAULT '{}',   -- checked items, quiz answer index, filename, etc.
  UNIQUE(assignment_id, step_id)
);

CREATE INDEX IF NOT EXISTS lms_step_completions_assignment_idx ON lms_step_completions(assignment_id);

-- ── RLS (enable if your project uses Row Level Security) ──────────────────────
-- ALTER TABLE lms_courses          ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE lms_steps            ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE lms_assignments      ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE lms_step_completions ENABLE ROW LEVEL SECURITY;
