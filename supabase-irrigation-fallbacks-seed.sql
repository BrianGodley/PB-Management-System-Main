-- ============================================================================
-- Irrigation: guarantee every rate that USED to have a code fallback now exists
-- in a table (so deleting the fallbacks can't zero out an estimate). Values are
-- the OLD code fallbacks. Inserts ONLY where the rate is missing — never
-- overwrites a value you've already set. Run on prod (and staging) BEFORE
-- deploying the fallback-free IrrigationModule / IrrigationSummary.
--
-- Each rate goes into the SAME table the module reads from:
--   per-zone labor (hrs/zone) + per-timer labor (hrs/ea) → labor_rates
--   zone + timer material unit prices                    → misc_rates
-- fetchStandardRateMap merges catalog + labor_rates + misc_rates, and the module
-- loads labor_rates separately, so both maps are covered.
-- ============================================================================

-- ── Zone / timer labor coefficients → labor_rates (category 'Irrigation') ────
insert into public.labor_rates (tenant_id, name, rate, category)
select t.tid, v.name, v.rate, 'Irrigation'
from (select tenant_id tid from public.labor_rates where category = 'Irrigation' limit 1) t
cross join (values
  ('Irrigation - Hand Zone',     16),
  ('Irrigation - Trench Zone',   12.5),
  ('Irrigation - Timer Install', 0.5)
) as v(name, rate)
where not exists (
  select 1 from public.labor_rates l
  where l.name = v.name and l.category = 'Irrigation'
);

-- ── Zone + timer material unit prices → misc_rates (category 'Irrigation') ────
-- Guarded vs the material catalog too, so an item already priced there is left alone.
insert into public.misc_rates (tenant_id, name, rate, category)
select t.tid, v.name, v.rate, 'Irrigation'
from (select tenant_id tid from public.labor_rates where category = 'Irrigation' limit 1) t
cross join (values
  ('Irrigation Zone - Planter Spray',                345),
  ('Irrigation Zone - Lawn',                         345),
  ('Irrigation Zone - Hillside',                     345),
  ('Irrigation Zone - Drip per Plant',               230),
  ('Irrigation Zone - Planter Dripline',             345),
  ('Irrigation Timer - 4 Station',                   69.0),
  ('Irrigation Timer - 6 Station',                   138.0),
  ('Irrigation Timer - 9 Station',                   184.0),
  ('Irrigation Timer - 12 Station',                  270.25),
  ('Irrigation Timer - 15 Station',                  322.0),
  ('Irrigation Timer - 18 Station',                  402.5),
  ('Irrigation Timer - Hunter ICC 8 Station',        345.0),
  ('Irrigation Timer - Additional 8 Station Module', 115.0)
) as v(name, rate)
where not exists (select 1 from public.misc_rates m where m.name = v.name and m.category = 'Irrigation')
  and not exists (select 1 from public.material mat where mat.description = v.name);

-- Verify:
-- select name, rate from public.labor_rates where category='Irrigation' order by name;
-- select name, rate from public.misc_rates  where category='Irrigation' order by name;
