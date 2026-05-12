-- supabase-update-88.sql
-- Positions table for HR → Positions tab

-- Drop dependent join table first, then positions (CASCADE removes the FK
-- constraint on the statistics table — the statistics data is untouched)
DROP TABLE IF EXISTS position_courses;
DROP TABLE IF EXISTS positions CASCADE;

CREATE TABLE positions (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title        text NOT NULL,
  description  text,
  vfp          text,           -- Valuable Final Product
  write_up_url text,           -- URL to position write-up / hat doc
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

-- Join table: which LMS courses are required for each position
-- positions.id is bigint; lms_courses.id is uuid — types must match each FK
CREATE TABLE position_courses (
  position_id bigint NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  course_id   uuid   NOT NULL REFERENCES lms_courses(id) ON DELETE CASCADE,
  PRIMARY KEY (position_id, course_id)
);

-- Re-attach the FK that statistics had on positions (CASCADE removed it above)
ALTER TABLE statistics
  ADD CONSTRAINT statistics_owner_position_id_fkey
  FOREIGN KEY (owner_position_id) REFERENCES positions(id) ON DELETE SET NULL;

ALTER TABLE positions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE position_courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "positions_all" ON positions;
CREATE POLICY "positions_all" ON positions
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "position_courses_all" ON position_courses;
CREATE POLICY "position_courses_all" ON position_courses
  FOR ALL USING (true) WITH CHECK (true);

-- Trigger to keep updated_at fresh
CREATE OR REPLACE FUNCTION update_positions_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_positions_updated_at ON positions;
CREATE TRIGGER trg_positions_updated_at
  BEFORE UPDATE ON positions
  FOR EACH ROW EXECUTE FUNCTION update_positions_updated_at();
