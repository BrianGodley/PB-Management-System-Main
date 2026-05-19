-- Seed Drainage Additional Items into material_rates so the inline calculator
-- icon next to each Material $ cell in the Drainage module has a real row to
-- read and update. Names match ADD_ITEM_RATES[*].dbName in
-- src/components/modules/DrainageModule.jsx.
--
-- Safe to re-run: ON CONFLICT DO NOTHING (requires a unique index on the
-- conflict target; if you don't have one the clause is skipped and you may
-- end up with duplicates — dedupe manually or add the index first).

INSERT INTO public.material_rates (name, unit_cost, unit, category, notes) VALUES
  ('Pump Vault',               275, 'ea', 'Drainage', 'Additional item — pump vault material cost'),
  ('Sump Pump',                650, 'ea', 'Drainage', 'Additional item — sump pump material cost'),
  ('Curb Core',                250, 'ea', 'Drainage', 'Additional item — curb core material cost'),
  ('Hydrocut Under Hardscape', 50,  'ea', 'Drainage', 'Additional item — hydrocut under hardscape material cost')
ON CONFLICT DO NOTHING;
