-- ============================================================================
-- Steps: guarantee every rate that USED to have a code fallback now exists in a
-- table, so deleting the module's hardcoded fallbacks can't zero out an
-- estimate. Values are the OLD code fallbacks. Inserts ONLY where the rate is
-- missing (WHERE NOT EXISTS) — never overwrites a value you've already set. Run
-- on prod (and staging) BEFORE deploying the fallback-free StepsModule.
--
-- Read map (must match the module):
--   Paver Form + Concrete Form labor  → labor_rates   (StepsModule loads
--     laborRates via labor_rates WHERE category='Steps').
--   Subcontractor $/LF base rates     → misc_rates    (StepsModule loads
--     materialRates via fetchStandardRateMap(['Steps']) = catalog Standard +
--     labor_rates + misc_rates; saveStandardNamedRate writes these to
--     misc_rates unless a material.description matches).
-- ============================================================================

-- ── Labor coefficients (labor_rates, category 'Steps') ──────────────────────
--   kPaverForm(form)  → 'Steps - <Form>'            (LF/hr, was PAVER_FORM_DEFAULT)
--   kConcForm(form)   → 'Steps - Conc Form <Form>'  (× multiplier, was ?? 1)
insert into public.labor_rates (tenant_id, name, rate, category)
select t.tid, v.name, v.rate, 'Steps'
from (select tenant_id tid from public.labor_rates where category = 'Steps' limit 1) t
cross join (values
  ('Steps - Straight',           1.5),
  ('Steps - Curved',             1.0),
  ('Steps - Conc Form Straight', 1),
  ('Steps - Conc Form Curved',   1)
) as v(name, rate)
where not exists (
  select 1 from public.labor_rates l where l.name = v.name and l.category = 'Steps'
);

-- ── Subcontractor per-LF base rates (misc_rates, category 'Steps') ──────────
--   sec.baseKey / kSubConcBase — was SUB_BASE_DEFAULT = 30 $/LF.
-- Guarded vs an existing material.description so a catalog product with the same
-- name (if one is ever added) stays the source of truth.
insert into public.misc_rates (tenant_id, name, rate, category)
select t.tid, v.name, v.rate, 'Steps'
from (select tenant_id tid from public.labor_rates where category = 'Steps' limit 1) t
cross join (values
  ('Steps - Sub Paver Base',     30),
  ('Steps - Sub Brick Base',     30),
  ('Steps - Sub Tile Base',      30),
  ('Steps - Sub Flagstone Base', 30),
  ('Steps - Sub Conc Base',      30)
) as v(name, rate)
where not exists (select 1 from public.misc_rates m where m.name = v.name and m.category = 'Steps')
  and not exists (select 1 from public.material mat where mat.description = v.name);

-- Verify:
-- select name, rate from public.labor_rates where category='Steps' order by name;
-- select name, rate from public.misc_rates  where category='Steps' order by name;
