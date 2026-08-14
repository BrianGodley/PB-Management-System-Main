-- ============================================================================
-- Demo modules (Hand / Skid / Mini): tons → cubic-yard conversion rate keys.
-- Idempotent, insert-only. Run on prod + staging.
--
-- The three demo estimators now show/bill removal VOLUME in cubic yards instead
-- of tons. This adds the new rate keys the modules read:
--   • Sub-haul billing per Cu Yd  (subcontractor_rates)
--       'Demo - <M> Sub Haul CY - Concrete | Dirt | Grass'
--   • Tree green-waste volume factor (labor_rates)
--       'Demo - <M> Tree CY Factor'  (cubic yards of green waste per 10 ft of tree)
--
-- Where an equivalent OLD key exists we carry its value over as a STARTING
-- value (review/tune in Master Rates). Otherwise a sensible default is seeded.
-- ============================================================================

-- 1) Per-Cu-Yd sub-haul rates — carry the old per-1.5-ton value across as a
--    starting point (rename '… Sub Haul - X' → '… Sub Haul CY - X').
insert into public.subcontractor_rates (tenant_id, company_name, category, rate)
select o.tenant_id,
       replace(o.company_name, ' Sub Haul - ', ' Sub Haul CY - '),
       o.category,
       o.rate
from public.subcontractor_rates o
where o.company_name in (
  'Demo - Hand Sub Haul - Concrete', 'Demo - Hand Sub Haul - Dirt', 'Demo - Hand Sub Haul - Grass',
  'Demo - Skid Sub Haul - Concrete', 'Demo - Skid Sub Haul - Dirt', 'Demo - Skid Sub Haul - Grass',
  'Demo - Mini Sub Haul - Concrete', 'Demo - Mini Sub Haul - Dirt', 'Demo - Mini Sub Haul - Grass'
)
and not exists (
  select 1 from public.subcontractor_rates n
  where n.company_name = replace(o.company_name, ' Sub Haul - ', ' Sub Haul CY - ')
    and n.category = o.category
);

-- 1b) Any CY sub-haul key still missing (no old row to copy) → seed at 0 so the
--     picker row exists and is editable in Master Rates / View Rates.
insert into public.subcontractor_rates (tenant_id, company_name, category, rate)
select t.tid, v.name, 'Demo', 0
from (select tenant_id tid from public.subcontractor_rates limit 1) t
cross join (values
  ('Demo - Hand Sub Haul CY - Concrete'), ('Demo - Hand Sub Haul CY - Dirt'), ('Demo - Hand Sub Haul CY - Grass'),
  ('Demo - Skid Sub Haul CY - Concrete'), ('Demo - Skid Sub Haul CY - Dirt'), ('Demo - Skid Sub Haul CY - Grass'),
  ('Demo - Mini Sub Haul CY - Concrete'), ('Demo - Mini Sub Haul CY - Dirt'), ('Demo - Mini Sub Haul CY - Grass')
) v(name)
where not exists (
  select 1 from public.subcontractor_rates n where n.company_name = v.name
);

-- 2) Tree CY Factor — carry the old 'Tree Tonnage Factor' value across as a
--    starting point (cubic yards of green waste per 10 ft of tree). Tune later.
insert into public.labor_rates (tenant_id, name, rate, unit, category)
select o.tenant_id,
       replace(o.name, 'Tree Tonnage Factor', 'Tree CY Factor'),
       o.rate,
       'Cu Yd per 10ft per Each',
       o.category
from public.labor_rates o
where o.name in (
  'Demo - Hand Tree Tonnage Factor',
  'Demo - Skid Tree Tonnage Factor',
  'Demo - Mini Tree Tonnage Factor'
)
and not exists (
  select 1 from public.labor_rates n
  where n.name = replace(o.name, 'Tree Tonnage Factor', 'Tree CY Factor')
    and n.category = o.category
);

-- 2b) Any Tree CY Factor still missing → seed a sensible default (1 Cu Yd per
--     10 ft of tree). Tune in View Rates.
insert into public.labor_rates (tenant_id, name, rate, unit, category)
select t.tid, v.name, 1, 'Cu Yd per 10ft per Each', 'Demo'
from (select tenant_id tid from public.labor_rates limit 1) t
cross join (values
  ('Demo - Hand Tree CY Factor'),
  ('Demo - Skid Tree CY Factor'),
  ('Demo - Mini Tree CY Factor')
) v(name)
where not exists (
  select 1 from public.labor_rates n where n.name = v.name
);
