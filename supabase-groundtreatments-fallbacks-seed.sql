-- ============================================================================
-- Ground Treatments: guarantee every rate/coefficient that USED to have a code
-- fallback (GT_RATES.fallback + the inline p(name, CONST) coefficients) now
-- exists in a table, so deleting the fallbacks can't zero out an estimate.
-- Values are the old code fallbacks. Inserts ONLY where missing — never
-- overwrites. Run on prod (and staging) BEFORE deploying the fallback-free
-- GroundTreatmentsModule / GroundTreatmentsSummary.
--
-- Labor + tunable estimating coefficients → labor_rates (category 'Ground
-- Treatments'); the module/summary read them from the merged rate map (which
-- includes labor_rates). Material fees → misc_rates (category 'Ground
-- Treatments'), skipped when a catalog material.description already carries the
-- name (the new-model material price wins). Per-type product prices (Mulch /
-- Gravel / Sod / DG / Steppers / …) live in the catalog and are NOT seeded here.
-- Sub $/SF rates had a 0 fallback (0 with or without the row), so they are not
-- seeded.
-- ============================================================================

-- Labor + tunable coefficients → labor_rates.
insert into public.labor_rates (tenant_id, name, rate, category)
select t.tid, v.name, v.rate, 'Ground Treatments'
from (select tenant_id tid from public.labor_rates where category = 'Ground Treatments' limit 1) t
cross join (values
  ('Mulch - Labor Rate',                  15),
  ('Plastic Edging - Labor Rate',         0.09),
  ('Metal Edging - Labor Rate',           0.17),
  ('Soil Prep - Labor Rate',              0.012),
  ('Soil Prep - Hand Add',                0.06),
  ('Sod Soil Prep - Labor Rate',          0.012),
  ('GT - Till Hand Labor Rate',           0.06),
  ('GT - Till Tiller Labor Rate',         0.012),
  ('Sod - Labor Rate',                    0.01143),
  ('Fertilizer - SF Per Bag',             4000),
  ('Flagstone Steppers - Soil Labor',     35),
  ('Flagstone Steppers - Concrete Labor', 25),
  ('Precast Steppers - Soil Labor',       50),
  ('Precast Steppers - Concrete Labor',   35),
  ('DG - Hand Labor Rate',                0.5),
  ('DG - Machine Labor Rate',             12),
  ('Gravel Fabric - Labor Rate',          0.024),
  ('Gravel - Machine Labor Rate',         12),
  ('Gravel - Hand Labor Rate',            4),
  ('GT - Mulch Coverage SF/Day',          3200),
  ('GT - Steppers SF Per Ton',            80),
  ('GT - DG Tons Denominator',            200),
  ('GT - DG Removal Swell',               1.62),
  ('GT - DG Cleanup Coverage SF/Day',     1000),
  ('GT - DG Cement Labor Factor',         1.25),
  ('GT - DG Material Markup',             1.1),
  ('GT - Aggregate Removal Swell',        1.62),
  ('Soils Install Labor',                 0.002)
) as v(name, rate)
where not exists (
  select 1 from public.labor_rates l where l.name = v.name and l.category = 'Ground Treatments'
);

-- Material fees / consumables → misc_rates (skipped if already a catalog material).
insert into public.misc_rates (tenant_id, name, rate, category)
select t.tid, v.name, v.rate, 'Ground Treatments'
from (select tenant_id tid from public.labor_rates where category = 'Ground Treatments' limit 1) t
cross join (values
  ('Gravel Fabric',      0.1),
  ('Mulch Delivery Fee', 75),
  ('DG Cement Mix',      20)
) as v(name, rate)
where not exists (select 1 from public.misc_rates m where m.name = v.name and m.category = 'Ground Treatments')
  and not exists (select 1 from public.material mat where mat.description = v.name);

-- Verify:
-- select name, rate from public.labor_rates where category='Ground Treatments' order by name;
-- select name, rate from public.misc_rates  where category='Ground Treatments' order by name;
