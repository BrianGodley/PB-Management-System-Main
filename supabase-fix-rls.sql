-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-fix-rls.sql
-- Enables Row-Level Security on tables that were missing it.
-- Safe to run multiple times (idempotent).
-- ─────────────────────────────────────────────────────────────────────────────

-- ── crews ─────────────────────────────────────────────────────────────────────
ALTER TABLE crews ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'crews' AND policyname = 'crews_all'
  ) THEN
    CREATE POLICY "crews_all" ON crews FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── master_equipment ──────────────────────────────────────────────────────────
ALTER TABLE master_equipment ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'master_equipment' AND policyname = 'master_equipment_all'
  ) THEN
    CREATE POLICY "master_equipment_all" ON master_equipment FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── module_equipment_map ──────────────────────────────────────────────────────
ALTER TABLE module_equipment_map ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'module_equipment_map' AND policyname = 'module_equipment_map_all'
  ) THEN
    CREATE POLICY "module_equipment_map_all" ON module_equipment_map FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── paver_prices ──────────────────────────────────────────────────────────────
ALTER TABLE paver_prices ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'paver_prices' AND policyname = 'paver_prices_all'
  ) THEN
    CREATE POLICY "paver_prices_all" ON paver_prices FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ── work_orders ───────────────────────────────────────────────────────────────
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'work_orders' AND policyname = 'work_orders_all'
  ) THEN
    CREATE POLICY "work_orders_all" ON work_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
