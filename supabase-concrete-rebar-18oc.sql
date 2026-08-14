-- ============================================================================
-- Concrete: add the 18" OC rebar-install pattern rates. Idempotent, insert-only
-- (never overwrites). Run on prod + staging.
--   • Labor: production SF/hr equivalent to $0.85/SF at the $35/hr labor rate
--     (35 / 0.85 = 41.18 SF/hr). Editable in Concrete → View Rates → Rebar Install.
--   • Material: 0.79 Ln Ft of rebar per SF for an 18" OC grid (consistent with
--     your 24"=0.59 / 12"=1.20).
-- Note: because labor is stored as SF/hr, the effective $/SF tracks the company
-- labor rate — it stays $0.85/SF only while the labor rate is $35/hr.
-- ============================================================================

insert into public.labor_rates (tenant_id, name, rate, unit, category)
select t.tid, 'Concrete - Rebar 18" OC', 41.18, 'Sq Ft per hr', 'Concrete'
from (select tenant_id tid from public.labor_rates where category = 'Concrete' limit 1) t
where not exists (
  select 1 from public.labor_rates
  where name = 'Concrete - Rebar 18" OC' and category = 'Concrete'
);

insert into public.misc_rates (tenant_id, name, rate, category)
select t.tid, 'Concrete - Rebar LF/SF 18" OC', 0.79, 'Concrete'
from (select tenant_id tid from public.labor_rates where category = 'Concrete' limit 1) t
where not exists (
  select 1 from public.misc_rates
  where name = 'Concrete - Rebar LF/SF 18" OC' and category = 'Concrete'
);
