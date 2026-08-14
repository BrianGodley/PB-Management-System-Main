-- ============================================================================
-- Concrete: guarantee every rate that USED to have a code fallback now exists
-- in a table (so deleting the fallbacks in ConcreteModule.jsx can't zero out an
-- estimate). Values are the old code fallbacks. Inserts ONLY where the rate is
-- missing (WHERE NOT EXISTS) — never overwrites a value you've already set.
-- Run on prod (and staging) BEFORE deploying the fallback-free ConcreteModule.
--
-- MATERIAL unit costs (ready mix, rebar $/LF, form lumber, sleeves, color,
-- sealers, vapor barrier, base) already come ONLY from the catalog / unpriced
-- modal — they had NO code fallbacks and are NOT seeded here.
--
-- Where each rate is READ by the module:
--   labor_rates (category 'Concrete')         → production + coefficients (lr)
--   misc_rates  (category 'Concrete')          → rebar LF/SF + sealer SF/gal (mr)
--   subcontractor_rates (category 'Concrete')  → pump/finish/stamp/sub (sr)
-- ============================================================================

-- ── Labor production rates + coefficients → labor_rates ─────────────────────
insert into public.labor_rates (tenant_id, name, rate, category)
select t.tid, v.name, v.rate, 'Concrete'
from (select tenant_id tid from public.labor_rates where category = 'Concrete' limit 1) t
cross join (values
  ('Concrete - Pour & Finish',                23),
  ('Concrete - Rebar 24" OC',                 60),
  ('Concrete - Form Setting',                 18),
  ('Concrete - Sleeves',                      10),
  ('Concrete - Sealer Natural',              200),
  ('Concrete - Sealer Wet-Look',             120),
  ('Concrete - Vapor Barrier',                15),
  ('Concrete - Forming Complexity % Per Unit', 1),
  ('Concrete - Sand Finish SF/hr',           100),
  ('Concrete - Salt Finish SF/hr',            25),
  ('Concrete - Exposed Aggregate SF/hr',      50),
  ('Concrete - Seeded Aggregate SF/hr',       40),
  ('Concrete - Hand Mix Labor Uplift %',      15),
  ('Concrete - Base Skid Steer',            0.25),
  ('Concrete - Base Mini Skid Steer',        0.5),
  ('Concrete - Base Wheelbarrow',            1.0),
  ('Concrete - Install 100-300',             6.5),
  ('Concrete - Install 300-600',              12),
  ('Concrete - Install 600-1000',             20),
  ('Concrete - Install 1000-2000',            24),
  ('Concrete - Install 2000+',                28)
) as v(name, rate)
where not exists (
  select 1 from public.labor_rates l
  where l.name = v.name and l.category = 'Concrete'
);

-- ── Tunable qty coefficients → misc_rates ───────────────────────────────────
-- Skipped when a catalog material with the same description already exists.
insert into public.misc_rates (tenant_id, name, rate, category)
select t.tid, v.name, v.rate, 'Concrete'
from (select tenant_id tid from public.labor_rates where category = 'Concrete' limit 1) t
cross join (values
  ('Concrete - Rebar LF/SF 24" OC', 0.59),
  ('Concrete - Rebar LF/SF 12" OC',  1.2),
  ('Concrete - Sealer SF/gal',        70)
) as v(name, rate)
where not exists (select 1 from public.misc_rates m where m.name = v.name and m.category = 'Concrete')
  and not exists (select 1 from public.material mat where mat.description = v.name);

-- ── Sub / equipment flat rates → subcontractor_rates (company_name = item) ───
insert into public.subcontractor_rates (tenant_id, company_name, rate, unit, category)
select t.tid, v.name, v.rate, v.unit, 'Concrete'
from (select tenant_id tid from public.labor_rates where category = 'Concrete' limit 1) t
cross join (values
  ('Concrete - Pump Flat Fee',                 316.25, 'flat'),
  ('Concrete - Pump Per CY',                      9.2, 'Cu Yd'),
  ('Concrete - Sand Finish 400SF',                207, '400 Sq Ft'),
  ('Concrete - Stamp Sub Flat',                   800, 'flat'),
  ('Concrete - Stamp Sub Per CY',                 120, 'Cu Yd'),
  ('Concrete Sub - Per SF',                        12, 'Sq Ft'),
  ('Concrete Sub - Vapor Barrier Per SF',           1, 'Sq Ft'),
  ('Concrete Sub - Sealer Per SF',                  3, 'Sq Ft'),
  ('Concrete Sub - Sand Finish Per SF',             2, 'Sq Ft'),
  ('Concrete Sub - Salt Finish Per SF',             3, 'Sq Ft'),
  ('Concrete Sub - Stamped Per SF',                 3, 'Sq Ft'),
  ('Concrete Sub - Exposed Aggregate Per SF',       5, 'Sq Ft'),
  ('Concrete Sub - Exposed Aggregate Mat Per SF', 2.75, 'Sq Ft'),
  ('Concrete Sub - Seeded Aggregate Per SF',      4.5, 'Sq Ft'),
  ('Concrete Sub - Seeded Aggregate Mat Per SF', 1.75, 'Sq Ft')
) as v(name, rate, unit)
where not exists (
  select 1 from public.subcontractor_rates s
  where s.company_name = v.name and s.category = 'Concrete'
);

-- Verify:
-- select name, rate from public.labor_rates where category='Concrete' order by name;
-- select name, rate from public.misc_rates  where category='Concrete' order by name;
-- select company_name, rate from public.subcontractor_rates where category='Concrete' order by company_name;
