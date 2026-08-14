-- Artificial Turf: express Weed Fabric Install labor as SF/hr (not hrs per 1kSF).
-- Old 0.5 hrs per 1,000 SF == 2,000 SF/hr. Idempotent. Run on prod + staging.
insert into public.labor_rates (tenant_id, name, rate, unit, category)
select t.tid, 'Turf - Weed Fabric Install SF/hr', 2000, 'Sq Ft per hr', 'Artificial Turf'
from (select tenant_id tid from public.labor_rates where category = 'Artificial Turf' limit 1) t
where not exists (
  select 1 from public.labor_rates
  where name = 'Turf - Weed Fabric Install SF/hr' and category = 'Artificial Turf'
);
