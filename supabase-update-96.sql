-- Time-clock rebuild: permissions, breaks, and a reliable employee link.
-- Run in Supabase SQL editor.

-- 1. Per-employee time-clock permissions.
--    clock_in_multiple_manager  — may clock in ANY employees as a manager.
--    clock_in_multiple_crew_chief — may clock in their crew (+ other chiefs).
CREATE TABLE IF NOT EXISTS time_clock_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL UNIQUE REFERENCES employees(id) ON DELETE CASCADE,
  clock_in_multiple_manager boolean NOT NULL DEFAULT false,
  clock_in_multiple_crew_chief boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE time_clock_permissions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY time_clock_permissions_all ON time_clock_permissions
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Seed: anyone who is a crew chief on a master crew gets the crew-chief
-- permission on by default (admins can override later in HR > Settings).
INSERT INTO time_clock_permissions (employee_id, clock_in_multiple_crew_chief)
SELECT DISTINCT crew_chief_id, true
FROM crews
WHERE crew_chief_id IS NOT NULL
ON CONFLICT (employee_id) DO NOTHING;

-- 2. Breaks taken during a shift (fixed-length lunch / short break).
--    The running clock subtracts these. started_at + minutes defines the window.
CREATE TABLE IF NOT EXISTS time_clock_breaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  time_entry_id uuid NOT NULL REFERENCES time_entries(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('lunch', 'short')),
  minutes integer NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS time_clock_breaks_entry_idx ON time_clock_breaks (time_entry_id);
ALTER TABLE time_clock_breaks ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY time_clock_breaks_all ON time_clock_breaks
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Reliable employee link on time entries (kept alongside employee_name).
--    Lets multi clock-in and "recent jobs" key off the employee, not a string.
ALTER TABLE time_entries
  ADD COLUMN IF NOT EXISTS employee_id uuid REFERENCES employees(id);
CREATE INDEX IF NOT EXISTS time_entries_employee_idx ON time_entries (employee_id);
