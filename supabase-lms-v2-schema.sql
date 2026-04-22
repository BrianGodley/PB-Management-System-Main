-- ─────────────────────────────────────────────────────────────────────────────
-- LMS v2 Schema
-- Run AFTER supabase-hr-schema.sql (requires employees table).
-- This drops the old LMS tables and rebuilds with 7 step types +
-- separate content libraries (Read Items, Learning Drills, Quizzes,
-- Final Tests, Actions) and attempt-tracking for quizzes/tests.
-- ─────────────────────────────────────────────────────────────────────────────

-- Drop old tables (reverse dependency order)
DROP TABLE IF EXISTS lms_step_completions  CASCADE;
DROP TABLE IF EXISTS lms_quiz_attempts     CASCADE;
DROP TABLE IF EXISTS lms_assignments       CASCADE;
DROP TABLE IF EXISTS lms_steps             CASCADE;
DROP TABLE IF EXISTS lms_courses           CASCADE;
DROP TABLE IF EXISTS lms_read_items        CASCADE;
DROP TABLE IF EXISTS lms_learning_drills   CASCADE;
DROP TABLE IF EXISTS lms_quizzes           CASCADE;
DROP TABLE IF EXISTS lms_tests             CASCADE;
DROP TABLE IF EXISTS lms_actions           CASCADE;

-- ── Content Libraries ──────────────────────────────────────────────────────────

-- Read Items (file uploaded to 'lms-documents' Supabase storage bucket)
CREATE TABLE lms_read_items (
  id               UUID  DEFAULT gen_random_uuid() PRIMARY KEY,
  title            TEXT  NOT NULL,
  description      TEXT,
  doc_url          TEXT,            -- public URL from storage
  file_name        TEXT,            -- original filename
  created_by_email TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Learning Drills
CREATE TABLE lms_learning_drills (
  id               UUID  DEFAULT gen_random_uuid() PRIMARY KEY,
  title            TEXT  NOT NULL,
  description      TEXT,
  content          TEXT,            -- drill body / instructions
  created_by_email TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Quizzes (mini tests)
-- questions: [{id, question, options: [str,str,str,str], correct_index: 0}]
CREATE TABLE lms_quizzes (
  id               UUID     DEFAULT gen_random_uuid() PRIMARY KEY,
  title            TEXT     NOT NULL,
  description      TEXT,
  questions        JSONB    DEFAULT '[]',
  passing_score    INTEGER  DEFAULT 70,   -- percentage required to pass
  max_attempts     INTEGER  DEFAULT 3,    -- max allowed attempts
  created_by_email TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Final Tests (higher threshold than quizzes)
CREATE TABLE lms_tests (
  id               UUID     DEFAULT gen_random_uuid() PRIMARY KEY,
  title            TEXT     NOT NULL,
  description      TEXT,
  questions        JSONB    DEFAULT '[]',
  passing_score    INTEGER  DEFAULT 80,
  max_attempts     INTEGER  DEFAULT 2,
  created_by_email TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Actions
CREATE TABLE lms_actions (
  id               UUID  DEFAULT gen_random_uuid() PRIMARY KEY,
  title            TEXT  NOT NULL,
  instructions     TEXT,
  created_by_email TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── Courses / Checksheets ──────────────────────────────────────────────────────
CREATE TABLE lms_courses (
  id               UUID  DEFAULT gen_random_uuid() PRIMARY KEY,
  title            TEXT  NOT NULL,
  description      TEXT,
  category         TEXT  DEFAULT 'General',
  created_by_email TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── Steps ─────────────────────────────────────────────────────────────────────
-- step_type: 'read' | 'watch' | 'special_drill' | 'learning_drill'
--          | 'quiz'  | 'final_test' | 'action'
CREATE TABLE lms_steps (
  id                UUID     DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id         UUID     NOT NULL REFERENCES lms_courses(id)          ON DELETE CASCADE,
  step_order        INTEGER  NOT NULL DEFAULT 0,
  step_type         TEXT     NOT NULL,
  title             TEXT     NOT NULL,
  -- Inline fields (Watch, Special Drill)
  youtube_url       TEXT,
  instructions      TEXT,
  -- Library foreign keys (one will be set depending on step_type)
  read_item_id      UUID     REFERENCES lms_read_items(id)       ON DELETE SET NULL,
  learning_drill_id UUID     REFERENCES lms_learning_drills(id)  ON DELETE SET NULL,
  quiz_id           UUID     REFERENCES lms_quizzes(id)          ON DELETE SET NULL,
  test_id           UUID     REFERENCES lms_tests(id)            ON DELETE SET NULL,
  action_id         UUID     REFERENCES lms_actions(id)          ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX lms_steps_course_idx ON lms_steps(course_id);

-- ── Assignments ────────────────────────────────────────────────────────────────
CREATE TABLE lms_assignments (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id   UUID NOT NULL REFERENCES lms_courses(id)   ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id)     ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(course_id, employee_id)
);
CREATE INDEX lms_assignments_employee_idx ON lms_assignments(employee_id);

-- ── Step Completions (one row per step that is fully passed/done) ──────────────
CREATE TABLE lms_step_completions (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID NOT NULL REFERENCES lms_assignments(id) ON DELETE CASCADE,
  step_id       UUID NOT NULL REFERENCES lms_steps(id)       ON DELETE CASCADE,
  completed_at  TIMESTAMPTZ DEFAULT NOW(),
  score         INTEGER,   -- quiz/test final passing score
  UNIQUE(assignment_id, step_id)
);

-- ── Quiz / Test Attempt Log ────────────────────────────────────────────────────
-- Tracks every attempt (pass or fail) so max_attempts can be enforced.
CREATE TABLE lms_quiz_attempts (
  id            UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID    NOT NULL REFERENCES lms_assignments(id) ON DELETE CASCADE,
  step_id       UUID    NOT NULL REFERENCES lms_steps(id)       ON DELETE CASCADE,
  score         INTEGER NOT NULL,
  passed        BOOLEAN NOT NULL,
  attempted_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX lms_quiz_attempts_step_idx ON lms_quiz_attempts(assignment_id, step_id);

-- ── Row Level Security ─────────────────────────────────────────────────────────
ALTER TABLE lms_read_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_learning_drills   ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_quizzes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_tests             ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_actions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_courses           ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_steps             ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_assignments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_step_completions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE lms_quiz_attempts     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lms_v2_auth" ON lms_read_items        FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "lms_v2_auth" ON lms_learning_drills   FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "lms_v2_auth" ON lms_quizzes           FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "lms_v2_auth" ON lms_tests             FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "lms_v2_auth" ON lms_actions           FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "lms_v2_auth" ON lms_courses           FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "lms_v2_auth" ON lms_steps             FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "lms_v2_auth" ON lms_assignments       FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "lms_v2_auth" ON lms_step_completions  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "lms_v2_auth" ON lms_quiz_attempts     FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- Supabase Storage Bucket (create manually in dashboard → Storage):
--   "lms-documents"  — public bucket, for Read Item file uploads
-- ─────────────────────────────────────────────────────────────────────────────
