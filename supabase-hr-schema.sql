-- ─────────────────────────────────────────────────────────────────────────────
-- HR Module Schema
-- Run this in the Supabase SQL Editor.
--
-- Tables:
--   employees              — current & archived employee records
--   employee_documents     — files/links attached to an employee
--   employee_certifications — licenses & certifications with expiry tracking
--   applicants             — applicant tracking (ATS)
--   hr_review_forms        — customizable review form templates
--   hr_reviews             — completed review instances
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Employees ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS employees (
  id                          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name                  TEXT        NOT NULL,
  last_name                   TEXT        NOT NULL,
  email                       TEXT,
  phone                       TEXT,
  address                     TEXT,
  city                        TEXT,
  state                       TEXT,
  zip                         TEXT,
  start_date                  DATE,
  job_title                   TEXT,
  department                  TEXT,
  pay_rate                    DECIMAL(10,2),
  pay_type                    TEXT        DEFAULT 'hourly',  -- hourly | salary
  status                      TEXT        DEFAULT 'active',  -- active | archived
  emergency_contact_name      TEXT,
  emergency_contact_phone     TEXT,
  emergency_contact_relation  TEXT,
  avatar_url                  TEXT,
  notes                       TEXT,
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS employees_status_idx ON employees(status);

-- ── Employee Documents ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS employee_documents (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID        NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  doc_name    TEXT        NOT NULL,
  doc_url     TEXT        NOT NULL,
  category    TEXT        DEFAULT 'records',  -- records | id | other
  file_type   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS employee_documents_employee_idx ON employee_documents(employee_id);

-- ── Employee Certifications ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS employee_certifications (
  id          UUID  DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID  NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  cert_name   TEXT  NOT NULL,
  cert_number TEXT,
  issued_date DATE,
  expiry_date DATE,
  file_url    TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS employee_certs_employee_idx ON employee_certifications(employee_id);

-- ── Applicants (ATS) ──────────────────────────────────────────────────────────
-- work_experience: [{company, title, start_date, end_date, description}]
-- references:      [{name, phone, relation}]
CREATE TABLE IF NOT EXISTS applicants (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name       TEXT        NOT NULL,
  last_name        TEXT        NOT NULL,
  email            TEXT,
  phone            TEXT,
  address          TEXT,
  city             TEXT,
  state            TEXT,
  zip              TEXT,
  position_applied TEXT,
  status           TEXT        DEFAULT 'new',  -- new | reviewing | interview | offered | hired | rejected
  resume_url       TEXT,
  work_experience  JSONB       DEFAULT '[]',
  skills           TEXT,
  applicant_references JSONB   DEFAULT '[]',
  notes            TEXT,
  applied_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS applicants_status_idx ON applicants(status);

-- ── Review Form Templates ─────────────────────────────────────────────────────
-- fields: [{id, type, label, required, options}]
-- types: 'rating' | 'text' | 'yesno' | 'number' | 'header'
CREATE TABLE IF NOT EXISTS hr_review_forms (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  title       TEXT        NOT NULL,
  description TEXT,
  fields      JSONB       DEFAULT '[]',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Reviews (completed instances) ─────────────────────────────────────────────
-- responses: { fieldId: value }
CREATE TABLE IF NOT EXISTS hr_reviews (
  id             UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id    UUID    NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  review_form_id UUID    REFERENCES hr_review_forms(id) ON DELETE SET NULL,
  reviewer_name  TEXT,
  review_date    DATE    DEFAULT CURRENT_DATE,
  responses      JSONB   DEFAULT '{}',
  overall_rating DECIMAL(2,1),
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hr_reviews_employee_idx ON hr_reviews(employee_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- Authenticated users can read/write all HR data.
-- Anonymous users can INSERT applicants (public apply form).
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE employees              ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_documents     ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE applicants             ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_review_forms        ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_reviews             ENABLE ROW LEVEL SECURITY;

-- Full access for authenticated users
CREATE POLICY "hr_auth_all" ON employees              FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "hr_auth_all" ON employee_documents     FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "hr_auth_all" ON employee_certifications FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "hr_auth_all" ON applicants             FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "hr_auth_all" ON hr_review_forms        FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "hr_auth_all" ON hr_reviews             FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Allow anonymous INSERT for public application form
CREATE POLICY "public_apply" ON applicants FOR INSERT TO anon WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- Supabase Storage Buckets
-- Create these manually in the Supabase dashboard → Storage:
--   1. "employee-files"  — private, for authenticated uploads (avatars, docs, certs)
--   2. "public-uploads"  — public, for resume uploads from /apply form
-- ─────────────────────────────────────────────────────────────────────────────

-- After running this SQL, also run the LMS schema (supabase-lms-schema.sql)
-- which references the employees table created above.
