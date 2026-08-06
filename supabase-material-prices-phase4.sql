-- ============================================================================
-- Phase 4 — normalized multi-vendor pricing (foundation, additive/non-breaking)
-- ----------------------------------------------------------------------------
-- The normalized model reuses the EXISTING `material_price_history` table as
-- the per-(material, vendor) price ledger:
--     material_rates          = canonical material (spec + default price)
--     material_price_history  = one row per vendor per price period
--                               (material_rate_id, vendor_id, unit_cost, dates)
-- so a single canonical material can hold many vendors' prices over time.
--
-- This script only: (1) backfills an OPEN price period for every current
-- material_rates price so the ledger is complete, and (2) adds a vendor-aware
-- price resolver. Nothing in the app reads these yet — estimates are unaffected
-- until the resolver/writers are rewired (next increments). Run STAGING → PROD.
-- ============================================================================

-- 1) Backfill: ensure every material_rates row with a price has an OPEN period.
--    (Price-sheet-updated rows already have history; manually-set / seeded rows
--    like the Basic Materials catalog do not.)
insert into public.material_price_history
  (tenant_id, material_rate_id, vendor_id, unit_cost, effective_start, effective_end, source)
select mr.tenant_id, mr.id, mr.vendor_id, mr.unit_cost,
       coalesce(mr.created_at::date, current_date), null, 'migration'
from public.material_rates mr
where mr.unit_cost is not null
  and not exists (
    select 1 from public.material_price_history h
    where h.material_rate_id = mr.id
      and h.effective_end is null
  );

-- 2) Vendor-aware resolver — price of a material for a given vendor as of a date.
--    Order: the vendor's own price → the Unspecified (null-vendor) price →
--    the live material_rates.unit_cost. Coexists with the existing 2-arg
--    price_as_of(rate_id, date).
create or replace function public.price_as_of(p_material_id uuid, p_vendor_id uuid, p_date date)
returns numeric
language sql
stable
as $$
  select coalesce(
    (
      select h.unit_cost from public.material_price_history h
       where h.material_rate_id = p_material_id
         and h.vendor_id is not distinct from p_vendor_id
         and h.effective_start <= p_date
         and (h.effective_end is null or h.effective_end >= p_date)
       order by h.effective_start desc
       limit 1
    ),
    (
      select h.unit_cost from public.material_price_history h
       where h.material_rate_id = p_material_id
         and h.vendor_id is null
         and h.effective_start <= p_date
         and (h.effective_end is null or h.effective_end >= p_date)
       order by h.effective_start desc
       limit 1
    ),
    (select unit_cost from public.material_rates where id = p_material_id)
  );
$$;

-- 3) Convenience: current price for a material + vendor (today).
create or replace function public.material_current_price(p_material_id uuid, p_vendor_id uuid)
returns numeric
language sql
stable
as $$
  select public.price_as_of(p_material_id, p_vendor_id, current_date);
$$;

-- Verify:
-- select count(*) as open_periods from public.material_price_history where effective_end is null;
-- select public.material_current_price(id, vendor_id) from public.material_rates limit 5;
