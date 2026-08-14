-- ============================================================================
-- Weed Abatement: guarantee every In-House coefficient that USED to have a code
-- fallback (WEED_RATE_FB) now exists in a table, so deleting the fallbacks can't
-- zero out an estimate. Values are the old code fallbacks. Inserts ONLY where
-- missing — never overwrites. Run on prod (and staging) BEFORE deploying the
-- fallback-free WeedAbatementModule.
--
-- Labor-hour coefficients → labor_rates (category 'Weed Abatement'); the module
-- reads them from labor_rates. The per-1,000-SF material cost → misc_rates
-- (category 'Weed Abatement'); the module reads it via the Standard rate map.
-- The Sub $/SF rate never had a hardcoded fallback, so it is NOT seeded here.
-- ============================================================================

-- Labor-hour coefficients → labor_rates.
insert into public.labor_rates (tenant_id, name, rate, category)
select t.tid, v.name, v.rate, 'Weed Abatement'
from (select tenant_id tid from public.labor_rates where category = 'Weed Abatement' limit 1) t
cross join (values
  ('Weed Abatement - Travel hr/visit',  2),
  ('Weed Abatement - Flat hr/1k SF',    0.5),
  ('Weed Abatement - Hillside hr/1k SF', 1.0)
) as v(name, rate)
where not exists (
  select 1 from public.labor_rates l where l.name = v.name and l.category = 'Weed Abatement'
);

-- Per-1,000-SF material cost → misc_rates (skipped if a catalog material of the
-- same description already exists).
insert into public.misc_rates (tenant_id, name, rate, category)
select t.tid, v.name, v.rate, 'Weed Abatement'
from (select tenant_id tid from public.labor_rates where category = 'Weed Abatement' limit 1) t
cross join (values
  ('Weed Abatement - Material $/1k SF', 2)
) as v(name, rate)
where not exists (select 1 from public.misc_rates m where m.name = v.name and m.category = 'Weed Abatement')
  and not exists (select 1 from public.material mat where mat.description = v.name);

-- Verify:
-- select name, rate from public.labor_rates where category='Weed Abatement' order by name;
-- select name, rate from public.misc_rates  where category='Weed Abatement' order by name;
