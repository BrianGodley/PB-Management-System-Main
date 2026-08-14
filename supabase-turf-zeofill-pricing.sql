-- ZeoFill pet-odor infill is strictly a MATERIAL cost upgrade: $65 per bag,
-- each bag covering 25 Sq Ft. Update the two misc_rates coefficients the module
-- reads (category 'Artificial Turf'). Run on prod + staging.
update public.misc_rates
set rate = 65
where name = 'Turf - Infill ZeoFill' and category = 'Artificial Turf';

update public.misc_rates
set rate = 25
where name = 'Turf - Infill SF per Bag' and category = 'Artificial Turf';

-- If either row is missing, seed it:
insert into public.misc_rates (tenant_id, name, rate, category)
select t.tid, v.name, v.rate, 'Artificial Turf'
from (select tenant_id tid from public.misc_rates limit 1) t
cross join (values
  ('Turf - Infill ZeoFill',   65),
  ('Turf - Infill SF per Bag', 25)
) as v(name, rate)
where not exists (
  select 1 from public.misc_rates m
  where m.name = v.name and m.category = 'Artificial Turf'
);
