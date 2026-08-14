-- Artificial Turf: Class II + DG prep bases are priced by the cubic yard.
-- Volume = SF × depth/12 ÷ 27, using these DB-editable install depths (inches).
-- Idempotent. Run on prod + staging. Defaults: Class II 3", DG 1" — tune.
insert into public.misc_rates (tenant_id, name, rate, category)
select t.tid, v.name, v.rate, 'Artificial Turf'
from (select tenant_id tid from public.misc_rates limit 1) t
cross join (values
  ('Turf - Class II Depth In', 3),
  ('Turf - DG Depth In',       1)
) v(name, rate)
where not exists (
  select 1 from public.misc_rates m where m.name = v.name and m.category = 'Artificial Turf'
);
