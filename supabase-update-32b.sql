-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-update-32b.sql
-- Corrects the unit label on the two Irrigation zone labor rates.
-- The original insert used 'zones/hr' which is wrong — the rate is hrs/zone.
-- (16 hrs per zone, not 16 zones per hour.)
-- Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE labor_rates
  SET unit  = 'hrs/zone',
      notes = 'Hours per zone for hand installation (no trenching). Excel VLOOKUP Hand=16. Applies to: Planter Spray Heads, Hillside zones.'
  WHERE name = 'Irrigation - Hand Zone'
    AND category = 'Irrigation';

UPDATE labor_rates
  SET unit  = 'hrs/zone',
      notes = 'Hours per zone for trenched installation. Excel VLOOKUP Trench=12.5. Applies to: Lawn, Drip per Plant, Planter Dripline zones.'
  WHERE name = 'Irrigation - Trench Zone'
    AND category = 'Irrigation';

-- Verify:
-- SELECT name, rate, unit, notes FROM labor_rates WHERE category = 'Irrigation' ORDER BY name;
