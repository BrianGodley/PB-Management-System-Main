-- Artificial Turf: DG base install now has its OWN labor rate (SF/hr), separate
-- from the Class II / gravel base install. Idempotent, insert-only. Run on
-- prod + staging. Default 40 Sq Ft/hr — tune in Turf → View Rates → Turf Prep.
insert into public.labor_rates (tenant_id, name, rate, unit, category)
select t.tid, 'Turf - DG Base Install SF/hr', 40, 'Sq Ft per hr', 'Artificial Turf'
from (select tenant_id tid from public.labor_rates where category = 'Artificial Turf' limit 1) t
where not exists (
  select 1 from public.labor_rates
  where name = 'Turf - DG Base Install SF/hr' and category = 'Artificial Turf'
);
