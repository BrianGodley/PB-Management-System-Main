-- Artificial Turf: rename the gravel Turf Base catalog item to "Class II Roadbase"
-- so the base-type picker option reads Class II Roadbase (matches the module's
-- built-in mapping, which still targets this item via its price key). Idempotent.
update public.material m
set description = 'Class II Roadbase'
from public.category c, public.subcategory s
where m.category_id = c.id
  and m.subcategory_id = s.id
  and c.name = 'Artificial Turf'
  and s.name = 'Turf Base'
  and m.description ilike '%gravel%'
  and not exists (
    select 1 from public.material m2
    where m2.subcategory_id = m.subcategory_id
      and m2.description = 'Class II Roadbase'
  );
