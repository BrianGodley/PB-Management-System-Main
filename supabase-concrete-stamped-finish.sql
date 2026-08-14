-- Concrete: in-house labor rate for Stamped finish (30 Sq Ft/hr). Idempotent.
insert into public.labor_rates (tenant_id, name, rate, unit, category)
select t.tid, 'Concrete - Stamped Finish SF/hr', 30, 'Sq Ft per hr', 'Concrete'
from (select tenant_id tid from public.labor_rates where category = 'Concrete' limit 1) t
where not exists (
  select 1 from public.labor_rates
  where name = 'Concrete - Stamped Finish SF/hr' and category = 'Concrete'
);
