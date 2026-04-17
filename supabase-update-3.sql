-- ============================================================
-- Estimates system: estimates, estimate_projects, estimate_modules
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Estimates table
CREATE TABLE IF NOT EXISTS estimates (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  estimate_name text NOT NULL,
  type          text CHECK (type IN ('Residential', 'Commercial', 'Public Works')),
  client_name   text,
  status        text DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'approved', 'rejected')),
  notes         text,
  created_at    timestamptz DEFAULT now(),
  created_by    uuid REFERENCES auth.users(id)
);

-- 2. Estimate Projects table
CREATE TABLE IF NOT EXISTS estimate_projects (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  estimate_id  uuid REFERENCES estimates(id) ON DELETE CASCADE NOT NULL,
  project_name text NOT NULL,
  created_at   timestamptz DEFAULT now()
);

-- 3. Estimate Modules table
CREATE TABLE IF NOT EXISTS estimate_modules (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id    uuid REFERENCES estimate_projects(id) ON DELETE CASCADE NOT NULL,
  module_type   text NOT NULL,
  man_days      numeric DEFAULT 0,
  material_cost numeric DEFAULT 0,
  data          jsonb DEFAULT '{}',
  notes         text,
  created_at    timestamptz DEFAULT now()
);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_modules ENABLE ROW LEVEL SECURITY;

-- Estimates policies
DROP POLICY IF EXISTS "Auth users select estimates" ON estimates;
CREATE POLICY "Auth users select estimates" ON estimates FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Auth users insert estimates" ON estimates;
CREATE POLICY "Auth users insert estimates" ON estimates FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Auth users update estimates" ON estimates;
CREATE POLICY "Auth users update estimates" ON estimates FOR UPDATE USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Auth users delete estimates" ON estimates;
CREATE POLICY "Auth users delete estimates" ON estimates FOR DELETE USING (auth.role() = 'authenticated');

-- Estimate Projects policies
DROP POLICY IF EXISTS "Auth users select estimate_projects" ON estimate_projects;
CREATE POLICY "Auth users select estimate_projects" ON estimate_projects FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Auth users insert estimate_projects" ON estimate_projects;
CREATE POLICY "Auth users insert estimate_projects" ON estimate_projects FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Auth users update estimate_projects" ON estimate_projects;
CREATE POLICY "Auth users update estimate_projects" ON estimate_projects FOR UPDATE USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Auth users delete estimate_projects" ON estimate_projects;
CREATE POLICY "Auth users delete estimate_projects" ON estimate_projects FOR DELETE USING (auth.role() = 'authenticated');

-- Estimate Modules policies
DROP POLICY IF EXISTS "Auth users select estimate_modules" ON estimate_modules;
CREATE POLICY "Auth users select estimate_modules" ON estimate_modules FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Auth users insert estimate_modules" ON estimate_modules;
CREATE POLICY "Auth users insert estimate_modules" ON estimate_modules FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Auth users update estimate_modules" ON estimate_modules;
CREATE POLICY "Auth users update estimate_modules" ON estimate_modules FOR UPDATE USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Auth users delete estimate_modules" ON estimate_modules;
CREATE POLICY "Auth users delete estimate_modules" ON estimate_modules FOR DELETE USING (auth.role() = 'authenticated');
