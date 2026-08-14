-- ============================================================================
-- Paver Base Material → priced per CUBIC YARD
-- ----------------------------------------------------------------------------
-- Company-wide move: base aggregates (Class II roadbase / base rock the paver
-- base uses) are bought and priced by the CUBIC YARD, not the ton.
--
-- PaverModule now computes base MATERIAL cost as:
--     base_cubic_yards = area(SF) x depth(in)/12 / 27
--     material_cost    = base_cubic_yards x rate($/CY)
-- (Base LABOR / compaction is unchanged — still tonnage-based via the t/hr skid
--  and hand-spread rates and the "Paver - Tons Divisor" density coefficient.)
--
-- This migration repoints the base-material MASTER items to match:
--   1. Sets public.material.unit = 'Cu Yd' for every Paver "Base Material" item
--      (the House 'Base Material - Class II Roadbase' + any vendor base rock).
--   2. Converts their prices from $/ton to $/CY using the roadbase bulk
--      density of ~1.5 tons per cubic yard (compacted Class II aggregate).
--          $/CY = $/ton x 1.5
--   3. Converts the legacy code-fallback coefficient misc_rates
--      'Paver - Base Rock' ($/ton) the same way, so the rarely-hit fallback
--      path stays consistent.
--
-- HOW THE MODULE READS THE BASE PRICE (traced in code):
--   • Real vendor  → fetchModuleCatalog(['Paver']) → public.material rows in
--     category 'Paver' + subcategory 'Base Material', price from the open
--     public.material_price row (priceOf/ledger). unit shown from material.unit.
--   • Standard/House → fetchStandardRateMap → material Standard price keyed by
--     description 'Base Material - Class II Roadbase'.
--   • Fallback only  → misc_rates 'Paver - Base Rock' (category 'Paver').
--
-- CONVERSION FACTOR: 1.5 tons per cubic yard (Class II roadbase, compacted).
--
-- IDEMPOTENT: the price conversions only fire while the base material is still
-- flagged non-'Cu Yd', and the unit flip runs LAST — so a second run is a
-- no-op. Run once on prod (single live env); replay on staging when convenient.
-- ============================================================================

-- 1) Convert vendor + Standard base-material PRICES ($/ton -> $/CY).
--    Guard: only rows whose material.unit isn't already 'Cu Yd' (i.e. not yet
--    converted). Must run BEFORE the unit flip in step 3.
update public.material_price mp
set price = round((mp.price * 1.5)::numeric, 2)
from public.material m
join public.category    c on c.id = m.category_id
join public.subcategory s on s.id = m.subcategory_id
where mp.material_id = m.id
  and c.name = 'Paver'
  and s.name = 'Base Material'
  and coalesce(m.unit, '') <> 'Cu Yd';

-- 2) Convert the legacy code-fallback coefficient ($/ton -> $/CY).
--    Gated on the canonical House base item still being per-ton, so this stays
--    in lock-step with step 1 and is a no-op on re-run.
update public.misc_rates mr
set rate = round((mr.rate * 1.5)::numeric, 2)
where mr.name = 'Paver - Base Rock'
  and mr.category = 'Paver'
  and exists (
    select 1
    from public.material m
    join public.category    c on c.id = m.category_id
    join public.subcategory s on s.id = m.subcategory_id
    where c.name = 'Paver'
      and s.name = 'Base Material'
      and m.description = 'Base Material - Class II Roadbase'
      and coalesce(m.unit, '') <> 'Cu Yd'
  );

-- 3) Flip the base-material items' unit to 'Cu Yd' (runs LAST — it's the marker
--    that makes steps 1 & 2 idempotent).
update public.material m
set unit = 'Cu Yd'
from public.category    c,
     public.subcategory s
where m.category_id = c.id
  and m.subcategory_id = s.id
  and c.name = 'Paver'
  and s.name = 'Base Material'
  and coalesce(m.unit, '') <> 'Cu Yd';

-- Verify:
-- select m.description, m.unit, mp.price
--   from public.material m
--   join public.category    c  on c.id = m.category_id
--   join public.subcategory s  on s.id = m.subcategory_id
--   left join public.material_price mp
--          on mp.material_id = m.id and mp.effective_end is null
--  where c.name = 'Paver' and s.name = 'Base Material'
--  order by m.description;
-- select name, rate from public.misc_rates where name = 'Paver - Base Rock';
