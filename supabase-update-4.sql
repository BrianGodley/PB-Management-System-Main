-- ============================================================
-- Master Rates tables: material_rates, labor_rates, subcontractor_rates
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Material Rates
CREATE TABLE IF NOT EXISTS material_rates (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text NOT NULL,
  unit        text,
  unit_cost   numeric DEFAULT 0,
  category    text,
  notes       text,
  created_by  uuid REFERENCES auth.users(id),
  created_at  timestamptz DEFAULT now()
);

-- 2. Labor Rates
CREATE TABLE IF NOT EXISTS labor_rates (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name          text NOT NULL,
  rate_per_day  numeric DEFAULT 0,
  notes         text,
  created_by    uuid REFERENCES auth.users(id),
  created_at    timestamptz DEFAULT now()
);

-- 3. Subcontractor Rates
CREATE TABLE IF NOT EXISTS subcontractor_rates (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name  text NOT NULL,
  trade         text,
  rate          numeric DEFAULT 0,
  unit          text,
  notes         text,
  created_by    uuid REFERENCES auth.users(id),
  created_at    timestamptz DEFAULT now()
);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE material_rates      ENABLE ROW LEVEL SECURITY;
ALTER TABLE labor_rates         ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcontractor_rates ENABLE ROW LEVEL SECURITY;

-- material_rates policies
DROP POLICY IF EXISTS "Auth select material_rates"  ON material_rates;
CREATE POLICY "Auth select material_rates"  ON material_rates FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Auth insert material_rates"  ON material_rates;
CREATE POLICY "Auth insert material_rates"  ON material_rates FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Auth update material_rates"  ON material_rates;
CREATE POLICY "Auth update material_rates"  ON material_rates FOR UPDATE USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Auth delete material_rates"  ON material_rates;
CREATE POLICY "Auth delete material_rates"  ON material_rates FOR DELETE USING (auth.role() = 'authenticated');

-- labor_rates policies
DROP POLICY IF EXISTS "Auth select labor_rates"     ON labor_rates;
CREATE POLICY "Auth select labor_rates"     ON labor_rates FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Auth insert labor_rates"     ON labor_rates;
CREATE POLICY "Auth insert labor_rates"     ON labor_rates FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Auth update labor_rates"     ON labor_rates;
CREATE POLICY "Auth update labor_rates"     ON labor_rates FOR UPDATE USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Auth delete labor_rates"     ON labor_rates;
CREATE POLICY "Auth delete labor_rates"     ON labor_rates FOR DELETE USING (auth.role() = 'authenticated');

-- subcontractor_rates policies
DROP POLICY IF EXISTS "Auth select subcontractor_rates" ON subcontractor_rates;
CREATE POLICY "Auth select subcontractor_rates" ON subcontractor_rates FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Auth insert subcontractor_rates" ON subcontractor_rates;
CREATE POLICY "Auth insert subcontractor_rates" ON subcontractor_rates FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Auth update subcontractor_rates" ON subcontractor_rates;
CREATE POLICY "Auth update subcontractor_rates" ON subcontractor_rates FOR UPDATE USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Auth delete subcontractor_rates" ON subcontractor_rates;
CREATE POLICY "Auth delete subcontractor_rates" ON subcontractor_rates FOR DELETE USING (auth.role() = 'authenticated');
