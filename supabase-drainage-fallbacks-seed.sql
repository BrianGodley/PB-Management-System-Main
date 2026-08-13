-- ============================================================================
-- Drainage: guarantee every rate that USED to have a code fallback now exists
-- in a table (so deleting the fallbacks can't zero out an estimate). Values are
-- the old code fallbacks. Inserts ONLY where the rate is missing — never
-- overwrites a value you've already set. Run on prod (and staging) BEFORE
-- deploying the fallback-free DrainageModule.
--
-- Labor coefficients (trench/pipe/fixture/add-item/french labor) were already
-- seeded by supabase-drainage-labor-coefficients.sql — re-run that if unsure.
-- This file covers the MATERIAL ($/ft, add-item) and SUBCONTRACTOR rates.
-- ============================================================================

-- Tenant to stamp new rows with (single live tenant; taken from existing data).
-- French-drain fabric / gravel-bed rates + add-item material → misc_rates.
insert into public.misc_rates (tenant_id, name, rate, category)
select t.tid, v.name, v.rate, 'Drainage'
from (select tenant_id tid from public.labor_rates where category = 'Drainage' limit 1) t
cross join (values
  ('Drainage Drain Sock Material',    1),
  ('Drainage Drain Sock Labor',       1),
  ('Drainage Burrito Wrap Material',  1),
  ('Drainage Burrito Wrap Labor',     1.75),
  ('Drainage Gravel Bed 12in Material', 2),
  ('Drainage Gravel Bed 12in Labor',  1),
  ('Drainage Gravel Bed 24in Material', 8),
  ('Drainage Gravel Bed 24in Labor',  3),
  ('Sump Pump',                       650),
  ('Curb Core',                       250),
  ('Hydrocut Under Hardscape',        50)
) as v(name, rate)
where not exists (select 1 from public.misc_rates m where m.name = v.name and m.category = 'Drainage')
  and not exists (select 1 from public.material mat where mat.description = v.name);

-- Subcontractor flat rates (stored keyed by the item text in company_name,
-- which is how the module reads them today).
insert into public.subcontractor_rates (tenant_id, company_name, rate, unit, category)
select t.tid, v.name, v.rate, v.unit, 'Drainage'
from (select tenant_id tid from public.labor_rates where category = 'Drainage' limit 1) t
cross join (values
  ('Drainage Sub - Per LF',        16, 'Ln Ft'),
  ('Drainage Sub - Fixture Flat',  20, 'Each'),
  ('Drainage Sub - Sump Pump',    300, 'Each'),
  ('Drainage Sub - Curb Core',    250, 'Each'),
  ('Drainage Sub - Hydrocut Per LF', 10, 'Ln Ft')
) as v(name, rate, unit)
where not exists (
  select 1 from public.subcontractor_rates s
  where s.company_name = v.name and s.category = 'Drainage'
);

-- Verify:
-- select name, rate from public.misc_rates where category='Drainage' order by name;
-- select company_name, rate from public.subcontractor_rates where category='Drainage' order by company_name;
