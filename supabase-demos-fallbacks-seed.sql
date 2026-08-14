-- ============================================================================
-- Demo modules (Hand / Skid Steer / Mini Skid Steer): guarantee every rate that
-- USED to have a code fallback now exists in a table, so removing the fallbacks
-- from the modules can't zero out an estimate. Values are the OLD code fallbacks.
-- Inserts ONLY where the key is missing (WHERE NOT EXISTS) — never overwrites a
-- value you've already set. Mirrors supabase-drainage-fallbacks-seed.sql.
--
-- The demos use per-item / namespaced rate keys (e.g. 'Demo - Skid Dump -
-- Concrete'); each exact key is seeded below. Reads: labor_rates + misc_rates by
-- name, subcontractor_rates by company_name. Run on prod (and staging) BEFORE
-- deploying the fallback-free demo modules.
-- Single live tenant; tenant_id taken from an existing Demo labor_rates row.
-- ============================================================================

-- ── Labor coefficients & per-item labor rates → labor_rates (category 'Demo') ──
insert into public.labor_rates (tenant_id, name, rate, category)
select t.tid, v.name, v.rate, 'Demo'
from (select tenant_id tid from public.labor_rates where category = 'Demo' limit 1) t
cross join (values
  ('Demo - Hand Tons SF-in Denominator', 200),
  ('Demo - Hand Concrete Weight lb/cf', 150),
  ('Demo - Hand Import Base Labor Mult', 0.5),
  ('Demo - Hand Tree Tonnage Factor', 0.25),
  ('Demo - Hand Bucket Labor Mult', 2),
  ('Demo - Hand Difficulty Ratio', 1),
  ('Demo - Hand Concrete/Dirt', 0.75),
  ('Demo - Hand Grass', 0.75),
  ('Demo - Hand Import Base', 5.0),
  ('Demo - Hand Bucket', 0.38),
  ('Demo - Hand JJ Compaction', 1.75),
  ('Demo - Hand Rebar', 0.25),
  ('Demo - Hand Shrub', 0.75),
  ('Demo - Hand Stump Small', 1.25),
  ('Demo - Hand Stump Medium', 2.5),
  ('Demo - Hand Stump Large', 3.75),
  ('Demo - Hand Stump XL', 5),
  ('Demo - Hand Tree Small', 0.1),
  ('Demo - Hand Tree Medium', 0.17),
  ('Demo - Hand Tree Large', 0.23),
  ('Demo - Hand - Concrete SF', 1),
  ('Demo - Hand - Dirt SF', 1),
  ('Demo - Hand - Import Base SF', 1),
  ('Demo - Hand - Grass SF', 1),
  ('Demo - Hand - Misc Flat SF', 1),
  ('Demo - Hand - Misc Vert SF', 1),
  ('Demo - Hand - Footing SF', 1),
  ('Demo - Hand - Grade Cut SF', 1),
  ('Demo - Hand - Grade Fill SF', 1),
  ('Demo - Hand - JJ SF', 1),
  ('Demo - Hand Haul Sec/Ft', 4),
  ('Demo - Hand Load (CY)', 0.2),
  ('Demo - Hand Rebar SF/hr', 250),
  ('Demo - Skid Tons SF-in Denominator', 200),
  ('Demo - Skid Concrete Weight lb/cf', 150),
  ('Demo - Skid Import Base Labor Mult', 0.5),
  ('Demo - Skid Tree Tonnage Factor', 0.25),
  ('Demo - Skid Difficulty Ratio', 1),
  ('Demo - Skid - Concrete SF', 1),
  ('Demo - Skid - Dirt SF', 1),
  ('Demo - Skid - Grass SF', 1),
  ('Demo - Skid - Misc Flat SF', 1),
  ('Demo - Skid - Misc Vert SF', 1),
  ('Demo - Skid - Footing SF', 1),
  ('Demo - Skid - Grade Cut SF', 1),
  ('Demo - Skid Steer Grass', 2.1),
  ('Demo - Skid - Import Base SF', 1),
  ('Demo - Skid - Grade Fill SF', 1),
  ('Demo - Skid - JJ SF', 1),
  ('Demo - Skid - SS Compact SF', 1),
  ('Demo - Skid Rebar', 0.05),
  ('Demo - Skid Shrub', 0.75),
  ('Demo - Skid Stump Small', 1.25),
  ('Demo - Skid Stump Medium', 2.5),
  ('Demo - Skid Stump Large', 3.75),
  ('Demo - Skid Stump XL', 5),
  ('Demo - Skid Tree Small', 0.1),
  ('Demo - Skid Tree Medium', 0.15),
  ('Demo - Skid Tree Large', 0.2),
  ('Demo - Skid Steer Haul Sec/Ft', 0.25),
  ('Demo - Skid Steer Load (CY)', 0.75),
  ('Demo - Mini Tons SF-in Denominator', 200),
  ('Demo - Mini Concrete Weight lb/cf', 150),
  ('Demo - Mini Import Base Labor Mult', 0.5),
  ('Demo - Mini Tree Tonnage Factor', 0.25),
  ('Demo - Mini Difficulty Ratio', 1),
  ('Demo - Mini - Concrete SF', 1),
  ('Demo - Mini - Dirt SF', 1),
  ('Demo - Mini - Grass SF', 1),
  ('Demo - Mini - Misc Flat SF', 1),
  ('Demo - Mini - Misc Vert SF', 1),
  ('Demo - Mini - Footing SF', 1),
  ('Demo - Mini - Grade Cut SF', 1),
  ('Demo - Mini Skid Steer Grass', 0.75),
  ('Demo - Mini - Import Base SF', 1),
  ('Demo - Mini - Grade Fill SF', 1),
  ('Demo - Mini - JJ SF', 1),
  ('Demo - Mini - SS Compact SF', 1),
  ('Demo - Mini Rebar', 0.05),
  ('Demo - Mini Shrub', 0.75),
  ('Demo - Mini Stump Small', 1.25),
  ('Demo - Mini Stump Medium', 2.5),
  ('Demo - Mini Stump Large', 3.75),
  ('Demo - Mini Stump XL', 5),
  ('Demo - Mini Tree Small', 0.1),
  ('Demo - Mini Tree Medium', 0.15),
  ('Demo - Mini Tree Large', 0.2),
  ('Demo - Mini Haul Sec/Ft', 0.5),
  ('Demo - Mini Load (CY)', 0.2)
) as v(name, rate)
where not exists (select 1 from public.labor_rates l where l.name = v.name);

-- ── Dump fees / container / import-base material $ → misc_rates (category 'Demo') ──
-- Also guarded against an existing material.description so a real catalog row
-- (material + material_price) is never shadowed.
insert into public.misc_rates (tenant_id, name, rate, category)
select t.tid, v.name, v.rate, 'Demo'
from (select tenant_id tid from public.labor_rates where category = 'Demo' limit 1) t
cross join (values
  ('Demo - Hand Dump - Concrete', 36.21),
  ('Demo - Hand Dump - Dirt', 36.21),
  ('Demo - Hand Dump - Green Waste', 72.19),
  ('Demo - Hand Dump - Tree/Stump', 125.33),
  ('Demo - Hand Container (Low-Boy)', 770),
  ('Demo - Hand Container Capacity (CY)', 10),
  ('Demo - Hand Removal Swell', 1.2),
  ('Demo - Hand Import Base $/10cy', 150),
  ('Demo - Skid Dump - Concrete', 36.21),
  ('Demo - Skid Dump - Dirt', 36.21),
  ('Demo - Skid Dump - Green Waste', 72.19),
  ('Demo - Skid Container (Low-Boy)', 770),
  ('Demo - Skid Container Capacity (CY)', 10),
  ('Demo - Skid Removal Swell', 1.2),
  ('Demo - Skid Import Base $/10cy', 150),
  ('Demo - Mini Dump - Concrete', 36.21),
  ('Demo - Mini Dump - Dirt', 36.21),
  ('Demo - Mini Dump - Green Waste', 72.19),
  ('Demo - Mini Dump - Tree/Stump', 125.33),
  ('Demo - Mini Dump - Import Base', 7.5),
  ('Demo - Mini Container (Low-Boy)', 770),
  ('Demo - Mini Container Capacity (CY)', 10),
  ('Demo - Mini Removal Swell', 1.2),
  ('Demo - Mini Import Base $/10cy', 150)
) as v(name, rate)
where not exists (select 1 from public.misc_rates m where m.name = v.name and m.category = 'Demo')
  and not exists (select 1 from public.material mat where mat.description = v.name);

-- ── Subcontractor flat rates → subcontractor_rates (company_name = item text) ──
-- Guarded on company_name across all categories (the modules read these purely
-- by company_name), so an existing 'Sub Haul' row keeps its value.
insert into public.subcontractor_rates (tenant_id, company_name, rate, category)
select t.tid, v.name, v.rate, 'Demo'
from (select tenant_id tid from public.labor_rates where category = 'Demo' limit 1) t
cross join (values
  ('Demo - Hand Sub Haul - Concrete', 85),
  ('Demo - Hand Sub Haul - Dirt', 95),
  ('Demo - Hand Sub Haul - Grass', 120),
  ('Demo - Hand Sub Haul - Trash 12yd', 850),
  ('Demo - Hand Sub Haul - Concrete 12yd', 800),
  ('Demo - Hand Sub Haul - Soil 12yd', 650),
  ('Demo - Hand Sub Haul - Import Base 12yd', 350),
  ('Sub Demo - Hand SF', 2.8),
  ('Demo - Skid Sub Demo - Concrete', 175),
  ('Demo - Skid Sub Demo - Dirt/Rock', 135),
  ('Demo - Skid Sub Demo - Import Base', 1.5),
  ('Demo - Skid Sub Demo - Grass/Sod', 1.75),
  ('Demo - Skid Sub Demo - Misc Flat', 175),
  ('Demo - Skid Sub Demo - Grade Cut', 135),
  ('Demo - Skid Sub Haul - Concrete', 85),
  ('Demo - Skid Sub Haul - Dirt', 95),
  ('Demo - Skid Sub Haul - Grass', 120),
  ('Demo - Skid Sub Haul - Trash 12yd', 850),
  ('Demo - Skid Sub Haul - Concrete 12yd', 800),
  ('Demo - Skid Sub Haul - Soil 12yd', 650),
  ('Demo - Skid Sub Haul - Import Base 12yd', 350),
  ('Sub Demo - Skid 5-7in', 2.0),
  ('Sub Demo - Skid 2-4in', 1.75),
  ('Sub Demo - Skid 1-2in', 1.5),
  ('Sub Demo - Skid Misc Flat', 2.0),
  ('Demo - Mini Sub Haul - Concrete', 85),
  ('Demo - Mini Sub Haul - Dirt', 95),
  ('Demo - Mini Sub Haul - Grass', 120),
  ('Demo - Mini Sub Haul - Trash 12yd', 850),
  ('Demo - Mini Sub Haul - Concrete 12yd', 800),
  ('Demo - Mini Sub Haul - Soil 12yd', 650),
  ('Demo - Mini Sub Haul - Import Base 12yd', 350),
  ('Sub Demo - Mini 5-7in', 2.0),
  ('Sub Demo - Mini 2-4in', 1.75),
  ('Sub Demo - Mini 1-2in', 1.5),
  ('Sub Demo - Mini Misc Flat', 2.0)
) as v(name, rate)
where not exists (select 1 from public.subcontractor_rates s where s.company_name = v.name);

-- Verify:
-- select name, rate from public.labor_rates where category='Demo' order by name;
-- select name, rate from public.misc_rates where category='Demo' order by name;
-- select company_name, rate from public.subcontractor_rates where company_name like 'Demo -%' or company_name like 'Sub Demo -%' order by company_name;
