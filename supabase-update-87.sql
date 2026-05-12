-- supabase-update-87.sql
-- Employee Groups tables for HR Settings

CREATE TABLE IF NOT EXISTS employee_groups (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text NOT NULL,
  description text,
  color       text NOT NULL DEFAULT '#16a34a',
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS employee_group_members (
  group_id    uuid NOT NULL REFERENCES employee_groups(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  PRIMARY KEY (group_id, employee_id)
);

ALTER TABLE employee_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_group_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "employee_groups_all" ON employee_groups;
CREATE POLICY "employee_groups_all" ON employee_groups
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "employee_group_members_all" ON employee_group_members;
CREATE POLICY "employee_group_members_all" ON employee_group_members
  FOR ALL USING (true) WITH CHECK (true);
