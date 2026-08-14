-- ============================================================================
-- Paver: guarantee every rate that USED to have a code fallback now exists in a
-- table (so deleting the fallbacks in PaverModule.jsx can't zero out an
-- estimate). Values are the old code fallbacks. Inserts ONLY where the rate is
-- missing (WHERE NOT EXISTS) — never overwrites a value you've already set.
-- Run on prod (and staging) BEFORE deploying the fallback-free PaverModule.
--
-- Where each rate is READ by the module:
--   labor_rates (category 'Paver')  → production rates + all "Paver Sub - ..."
--     install $/SF lines (the module reads sub install rates from laborRates,
--     NOT subcontractor_rates — so they are seeded here, not there).
--   misc_rates  (category 'Paver')  → material $ + tunable coefficients, guarded
--     against an existing catalog material of the same description.
-- ============================================================================

-- ── Labor production rates + sub install $/SF lines → labor_rates ────────────
insert into public.labor_rates (tenant_id, name, rate, category)
select t.tid, v.name, v.rate, 'Paver'
from (select tenant_id tid from public.labor_rates where category = 'Paver' limit 1) t
cross join (values
  ('Paver - Install',                20),
  ('Paver - Straight Cut',           70),
  ('Paver - Curved Cut',             30),
  ('Paver - Restraints',             22),
  ('Paver - Sleeves',                10),
  ('Paver - Vertical Soldier',        8),
  ('Paver - Sealer',                200),
  ('Paver - 80mm Add',             0.15),
  ('Paver - Stone Add',            0.05),
  ('Paver - Color Add',            0.05),
  ('Paver - Poly Sand New',       0.004),
  ('Paver - Poly Sand Existing', 0.0075),
  ('Paver - Base Skid Steer Good',   10),
  ('Paver - Base Skid Steer OK',    7.5),
  ('Paver - Base Mini Skid Steer',    5),
  ('Paver - Base Hand',             2.5),
  ('Paver Sub - Hand Demo',           8),
  ('Paver Sub - Bobcat Demo',         7),
  ('Paver Sub - No Demo',          6.25),
  ('Paver Sub - No Demo/Base',      5.5),
  ('Paver Sub - Tile in Concrete',   12),
  ('Paver Sub - Permeable',          11),
  ('Paver Sub - Large Format Add',  1.5),
  ('Paver Sub - Under 500 Add',     1.0),
  ('Paver Sub - Sleeves LF',         12)
) as v(name, rate)
where not exists (
  select 1 from public.labor_rates l
  where l.name = v.name and l.category = 'Paver'
);

-- ── Material $ + tunable coefficients → misc_rates ──────────────────────────
-- Skipped when a catalog material with the same description already exists
-- (then the price is served from the catalog, not misc_rates).
insert into public.misc_rates (tenant_id, name, rate, category)
select t.tid, v.name, v.rate, 'Paver'
from (select tenant_id tid from public.labor_rates where category = 'Paver' limit 1) t
cross join (values
  ('Paver - Base Rock',            7.5),
  ('Bedding Sand',                25.3),
  ('Paver - Joint Sand',          0.05),
  ('Paver - Poly Sand',           0.56),
  ('Paver - Sealer',              0.63),
  ('Paver - Restraint Concrete',  1.38),
  ('Paver - Sleeves',             0.46),
  ('Paver - Pallet Charge',      51.75),
  ('Paver - Delivery',          442.75),
  ('Paver - Tons Divisor',         200),
  ('Paver - Delivery SF Increment', 900)
) as v(name, rate)
where not exists (select 1 from public.misc_rates m where m.name = v.name and m.category = 'Paver')
  and not exists (select 1 from public.material mat where mat.description = v.name);

-- Verify:
-- select name, rate from public.labor_rates where category='Paver' order by name;
-- select name, rate from public.misc_rates  where category='Paver' order by name;
