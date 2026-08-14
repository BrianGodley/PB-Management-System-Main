-- Consolidate Decomposed Granite (DG) into ONE canonical set of records that
-- live in Basic Materials (subcategory 'Decomposed Granite'), priced per cubic
-- yard. Ground Treatments AND Artificial Turf both pull from these.
--   Items: Decomposed Granite $50, DG - Stabilized $75, DG - Rock Dust Grey $120,
--          DG - Grey Stabilized Rock Dust $145  — already the real C&M $/Cu Yd
--          prices, so ONLY the location + unit change (no price math).
-- ('DG Cement Mix' is a per-ton cement add-on and stays in Ground Treatments.)
-- Run AFTER deploying the code that repoints Ground Treatments DG pricing to
-- Basic Materials. Idempotent. Run on prod + staging.

-- 1) Ensure a 'Decomposed Granite' subcategory exists under Basic Materials.
insert into public.subcategory (tenant_id, category_id, code, name)
select c.tenant_id, c.id, 'DG', 'Decomposed Granite'
from public.category c
where c.name = 'Basic Materials'
  and not exists (
    select 1 from public.subcategory s
    where s.category_id = c.id and s.name = 'Decomposed Granite'
  );

-- 2) Move the 4 DG products into Basic Materials → 'Decomposed Granite', unit Cu Yd.
update public.material m
set category_id = bc.id,
    subcategory_id = bs.id,
    unit = 'Cu Yd'
from public.category gc,
     public.category bc,
     public.subcategory bs
where m.category_id = gc.id
  and gc.name = 'Ground Treatments'
  and bc.name = 'Basic Materials'
  and bs.category_id = bc.id and bs.name = 'Decomposed Granite'
  and m.description in (
    'Decomposed Granite',
    'DG - Stabilized',
    'DG - Rock Dust Grey',
    'DG - Grey Stabilized Rock Dust'
  );
