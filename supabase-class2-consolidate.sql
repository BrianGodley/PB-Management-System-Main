-- Consolidate Class II Roadbase to ONE canonical record in Basic Materials that
-- every module maps to, priced at the real $24 per cubic yard.
--   • Canonical: category 'Basic Materials', subcategory 'Aggregate & Concrete',
--     description 'Class II Roadbase' → Standard price $24, unit 'Cu Yd'.
--   • Archive the duplicates (Concrete → Concrete Base, Artificial Turf → Turf
--     Base) so there is a single Class II rate to maintain.
-- Run AFTER deploying the code that repoints Concrete/Paver/Turf base pricing to
-- the canonical item. Idempotent. Run on prod + staging.

-- 1) Canonical Basic Materials item → $24/CY (Standard price) + unit Cu Yd.
update public.material_price mp
set price = 24
from public.material m
join public.category c    on c.id = m.category_id
join public.subcategory s on s.id = m.subcategory_id
join public.subs_vendors v on v.id = mp.vendor_id
where mp.material_id = m.id
  and mp.effective_end is null
  and c.name = 'Basic Materials'
  and s.name = 'Aggregate & Concrete'
  and m.description = 'Class II Roadbase'
  and (v.company_name ilike 'standard' or v.company_name ilike 'unspecified');

update public.material m
set unit = 'Cu Yd'
from public.category c, public.subcategory s
where c.id = m.category_id and s.id = m.subcategory_id
  and c.name = 'Basic Materials' and s.name = 'Aggregate & Concrete'
  and m.description = 'Class II Roadbase'
  and m.unit is distinct from 'Cu Yd';

-- 2) Archive the duplicate Class II Roadbase records (Concrete Base, Turf Base,
--    Paver Base Material) — run AFTER the code repoints those modules to the
--    canonical Basic Materials item.
update public.material m
set archived_at = now()
from public.category c, public.subcategory s
where c.id = m.category_id and s.id = m.subcategory_id
  and m.archived_at is null
  and (
    (c.name = 'Concrete' and s.name = 'Concrete Base' and m.description = 'Class II Roadbase') or
    (c.name = 'Artificial Turf' and s.name = 'Turf Base' and m.description = 'Class II Roadbase') or
    (c.name = 'Paver' and s.name = 'Base Material' and m.description = 'Base Material - Class II Roadbase')
  );
