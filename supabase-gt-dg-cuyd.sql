-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-gt-dg-cuyd.sql
-- Re-price Ground Treatments DECOMPOSED GRANITE material from $/ton → $/Cu Yd.
--
-- Part of the company-wide move to price base aggregates (DG, Class II roadbase)
-- by the cubic yard. The Ground Treatments estimator now computes DG MATERIAL as
-- CY × $/CY (labor + the per-ton "DG Cement Mix" add-on are unchanged).
--
-- Conversion factor (tons per cubic yard). The module derives DG volume two ways:
--     CY   = SF * depth_in / 324      (324 = 27 cf/cy * 12 in/ft)
--     tons = SF * depth_in / denom    (denom = labor_rates 'GT - DG Tons Denominator' = 200)
-- so   tons/CY = 324 / denom = 324 / 200 = 1.62.
-- Multiplying the stored $/ton price by 1.62 yields the equivalent $/CY price,
-- so existing estimates that used per-ton math price identically after this run.
-- The factor is derived LIVE from the coefficient below so the two stay in sync;
-- if that coefficient row is missing it falls back to 1.35 tons/CY (a typical DG
-- bulk density) — DOCUMENTED ASSUMPTION.
--
-- Target items: category 'Ground Treatments', descriptions
--   'Decomposed Granite', 'DG - Stabilized', 'DG - Rock Dust Grey',
--   'DG - Grey Stabilized Rock Dust'.
-- (The separate 'DG Cement Mix' add-on stays per ton and is intentionally excluded.)
--
-- Tables written: public.material (unit) and public.material_price (price, all
-- OPEN rows — Standard + any vendor). The estimator reads DG prices ONLY from
-- this NEW model (material + material_price via fetchModuleCatalog); the legacy
-- public.material_rates table is NOT read for Ground Treatments and is left
-- untouched here.
--
-- IDEMPOTENT: guarded so it only fires while the product unit is still ton-like
-- (or unset). The price is converted and the unit is flipped to 'Cu Yd' in the
-- same run, so re-executing this file converts nothing (unit no longer matches).
-- ─────────────────────────────────────────────────────────────────────────────

begin;

-- (a) Convert every OPEN price (Standard + each vendor) for the 4 DG products
--     from $/ton → $/Cu Yd. Guard: only while the product's unit is still ton-like
--     (or unset) — the unit flip in step (b) prevents a second conversion.
update public.material_price mp
set price = mp.price * f.tons_per_cy
from (
  select coalesce(324.0 / nullif(max(rate), 0), 1.35) as tons_per_cy
  from public.labor_rates
  where name = 'GT - DG Tons Denominator'
    and category = 'Ground Treatments'
) f
where mp.effective_end is null
  and mp.material_id in (
    select m.id
    from public.material m
    join public.category c on c.id = m.category_id
    where c.name = 'Ground Treatments'
      and m.description in (
        'Decomposed Granite',
        'DG - Stabilized',
        'DG - Rock Dust Grey',
        'DG - Grey Stabilized Rock Dust'
      )
      and (m.unit is null or m.unit ilike '%ton%')
  );

-- (b) Flip the unit to 'Cu Yd' (same guard) so step (a) cannot run twice.
update public.material m
set unit = 'Cu Yd'
from public.category c
where c.id = m.category_id
  and c.name = 'Ground Treatments'
  and m.description in (
    'Decomposed Granite',
    'DG - Stabilized',
    'DG - Rock Dust Grey',
    'DG - Grey Stabilized Rock Dust'
  )
  and (m.unit is null or m.unit ilike '%ton%');

commit;
