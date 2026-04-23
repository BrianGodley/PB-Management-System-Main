-- ============================================================
-- Landscape Job Tracker - Supabase Database Schema
-- Run this entire file in your Supabase SQL Editor
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- COMPANY SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS company_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name TEXT DEFAULT 'My Landscape Company',
  license_number TEXT DEFAULT '',
  logo_url TEXT DEFAULT '',
  labor_rate_per_man_day DECIMAL(10,2) DEFAULT 400.00,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings row
INSERT INTO company_settings (company_name, labor_rate_per_man_day)
VALUES ('My Landscape Company', 400.00)
ON CONFLICT DO NOTHING;

-- ============================================================
-- JOBS (Top-level: one per sold estimate / client project)
-- ============================================================
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_name TEXT NOT NULL,
  job_address TEXT NOT NULL,
  salesperson TEXT DEFAULT '',
  contract_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  date_sold DATE DEFAULT CURRENT_DATE,
  start_date DATE,
  estimated_completion DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'on_hold', 'cancelled')),
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ============================================================
-- PROJECTS (Within a job: pool, wall, irrigation, etc.)
-- ============================================================
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  project_name TEXT NOT NULL,
  project_type TEXT DEFAULT 'General',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MODULES (Within a project: e.g., Wall Module, Demo Module)
-- Each module is assigned to a crew type and has est. labor/materials
-- ============================================================
CREATE TABLE IF NOT EXISTS modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  module_name TEXT NOT NULL,
  crew_type TEXT DEFAULT 'General' CHECK (crew_type IN ('General', 'Demo', 'Concrete', 'Irrigation', 'Planting')),
  estimated_man_days DECIMAL(8,2) DEFAULT 0.00,
  estimated_material_cost DECIMAL(10,2) DEFAULT 0.00,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CHANGE ORDERS (Post-sale additions to a job)
-- ============================================================
CREATE TABLE IF NOT EXISTS change_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  additional_contract_price DECIMAL(10,2) DEFAULT 0.00,
  additional_man_days DECIMAL(8,2) DEFAULT 0.00,
  additional_material_cost DECIMAL(10,2) DEFAULT 0.00,
  date_added DATE DEFAULT CURRENT_DATE,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ============================================================
-- ACTUAL ENTRIES (Daily labor and material logs per module)
-- ============================================================
CREATE TABLE IF NOT EXISTS actual_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  entry_date DATE DEFAULT CURRENT_DATE,
  actual_man_days DECIMAL(8,2) DEFAULT 0.00,
  actual_material_cost DECIMAL(10,2) DEFAULT 0.00,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Makes sure only logged-in users can access data
-- ============================================================

ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE actual_entries ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read/write all records
CREATE POLICY "Authenticated users can view company_settings"
  ON company_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can update company_settings"
  ON company_settings FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view jobs"
  ON jobs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert jobs"
  ON jobs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update jobs"
  ON jobs FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete jobs"
  ON jobs FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view projects"
  ON projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert projects"
  ON projects FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update projects"
  ON projects FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete projects"
  ON projects FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view modules"
  ON modules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert modules"
  ON modules FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update modules"
  ON modules FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete modules"
  ON modules FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view change_orders"
  ON change_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert change_orders"
  ON change_orders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update change_orders"
  ON change_orders FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete change_orders"
  ON change_orders FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view actual_entries"
  ON actual_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert actual_entries"
  ON actual_entries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update actual_entries"
  ON actual_entries FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete actual_entries"
  ON actual_entries FOR DELETE TO authenticated USING (true);

-- ============================================================
-- DONE! Schema created successfully.
-- ============================================================
