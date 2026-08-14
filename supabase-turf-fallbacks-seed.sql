-- ============================================================================
-- Artificial Turf: guarantee every rate that USED to have a code fallback now
-- exists in a table (so deleting the fallbacks can't zero out an estimate).
-- Values are the OLD code fallbacks. Inserts ONLY where the rate is missing —
-- never overwrites a value you've already set. Run on prod (and staging) BEFORE
-- deploying the fallback-free ArtificialTurfModule.
--
-- Each rate goes into the SAME table + column the module reads from:
--   labor coefficients (demo tons/hr, install SF/hr + PH, cut, strip) → labor_rates
--   material prices + estimating factors (divisors, roll width, infill spec) → misc_rates
--   demo dump fees (shared 'Demo' category)                            → misc_rates
--   subcontractor flat rates                                           → subcontractor_rates
-- fetchStandardRateMap merges catalog + labor_rates + misc_rates, so the module
-- reads all of these through materialPrices / laborRates.
-- ============================================================================

-- ── Labor coefficients → labor_rates (category 'Artificial Turf') ────────────
insert into public.labor_rates (tenant_id, name, rate, category)
select t.tid, v.name, v.rate, 'Artificial Turf'
from (select tenant_id tid from public.labor_rates where category = 'Artificial Turf' limit 1) t
cross join (values
  ('Turf - Demo Skid Steer Good',          2.0),
  ('Turf - Demo Skid Steer OK',            1.5),
  ('Turf - Demo Mini Skid Steer',          0.75),
  ('Turf - Demo Wheelbarrow',              0.5),
  ('Turf - Demo Hand',                     0.38),
  ('Turf - Base Install SF/hr',            10),
  ('Turf - Base Install PH',               0.25),
  ('Turf - Weed Fabric Install hrs/1kSF',  8),
  ('Turf - Turf Install SF/hr',            20),
  ('Turf - Turf Install PH',               0.5),
  ('Turf - Cut/Staple/Seam LF/hr',         100),
  ('Turf - Cut/Staple/Seam PH',            1.0),
  ('Turf - Strip Install LF/hr',           12.5)
) as v(name, rate)
where not exists (
  select 1 from public.labor_rates l
  where l.name = v.name and l.category = 'Artificial Turf'
);

-- ── Material prices + estimating factors → misc_rates (category 'Artificial Turf')
-- Guarded vs the material catalog too, so an item already priced there is left alone.
insert into public.misc_rates (tenant_id, name, rate, category)
select t.tid, v.name, v.rate, 'Artificial Turf'
from (select tenant_id tid from public.labor_rates where category = 'Artificial Turf' limit 1) t
cross join (values
  ('Turf - Demo Tons Divisor',        200),
  ('Turf - Gravel Base Tons Divisor', 200),
  ('Turf - Weed Fabric SF per Roll',  1800),
  ('Turf - Roll Width FT',            15),
  ('Turf - Infill SF per Bag',        30),
  ('Turf - Gravel Base',              6.9),
  ('Turf - DG Base',                  57.5),
  ('Turf - Weed Barrier Fabric',      165.0),
  ('Turf - Install Materials',        0.14),
  ('Turf - Infill Durafill',          0.62),
  ('Turf - Infill ZeoFill',           30.0)
) as v(name, rate)
where not exists (select 1 from public.misc_rates m where m.name = v.name and m.category = 'Artificial Turf')
  and not exists (select 1 from public.material mat where mat.description = v.name);

-- ── Demo dump fees (shared 'Demo' category) → misc_rates ─────────────────────
-- Almost certainly already seeded by the Demo modules; guarded so they are only
-- created if truly missing (both misc_rates and the material catalog).
insert into public.misc_rates (tenant_id, name, rate, category)
select t.tid, v.name, v.rate, 'Demo'
from (select tenant_id tid from public.labor_rates where category = 'Artificial Turf' limit 1) t
cross join (values
  ('Dump Fee - Concrete',    36.21),
  ('Dump Fee - Dirt',        36.21),
  ('Dump Fee - Green Waste', 72.19)
) as v(name, rate)
where not exists (select 1 from public.misc_rates m where m.name = v.name and m.category = 'Demo')
  and not exists (select 1 from public.material mat where mat.description = v.name);

-- ── Subcontractor flat rates → subcontractor_rates (category 'Artificial Turf')
-- Stored keyed by the item text in company_name (how the module reads them).
insert into public.subcontractor_rates (tenant_id, company_name, rate, unit, category)
select t.tid, v.name, v.rate, v.unit, 'Artificial Turf'
from (select tenant_id tid from public.labor_rates where category = 'Artificial Turf' limit 1) t
cross join (values
  ('Turf Sub - Install Per SF',  3,  'Sq Ft'),
  ('Turf Sub - Strip Per LF',    10, 'Ln Ft')
) as v(name, rate, unit)
where not exists (
  select 1 from public.subcontractor_rates s
  where s.company_name = v.name and s.category = 'Artificial Turf'
);

-- Verify:
-- select name, rate from public.labor_rates where category='Artificial Turf' order by name;
-- select name, rate from public.misc_rates  where category='Artificial Turf' order by name;
-- select company_name, rate from public.subcontractor_rates where category='Artificial Turf' order by company_name;
