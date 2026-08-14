-- supabase-turf-cat-to-simple-turf-vendor.sql
-- Move every material in the 'Artificial Turf' category off the Standard vendor
-- and onto 'Irrigation Express - Simple Turf'
-- (Master Material Rates: items leave the Standard tab, appear under the Vendor tab).
--
-- Mechanics: re-point each OPEN Standard-vendor price row to the target vendor.
-- Where an item already has an open price under the target vendor (would collide
-- with the unique index uq_material_price_open on (material_id, vendor_id)), the
-- leftover Standard row is CLOSED instead, so the item still leaves the Standard
-- tab without a duplicate. Idempotent + safe to run on both staging and prod.

-- ── 1) Re-point non-colliding Standard rows to the target vendor ──────────────
with tgt as (
  select id from public.subs_vendors
  where lower(trim(company_name)) = lower('Irrigation Express - Simple Turf')
  limit 1
),
std_ids as (
  select id from public.subs_vendors
  where lower(trim(company_name)) in ('standard', 'unspecified')
),
turf_std as (
  select mp.id, mp.material_id
  from public.material_price mp
  join public.material m on m.id = mp.material_id
  join public.category c on c.id = m.category_id
  where mp.effective_end is null
    and lower(trim(c.name)) = 'artificial turf'
    and mp.vendor_id in (select id from std_ids)
)
update public.material_price mp
set vendor_id = (select id from tgt)
from turf_std ts
where mp.id = ts.id
  and not exists (
    select 1 from public.material_price x
    where x.material_id = ts.material_id
      and x.vendor_id = (select id from tgt)
      and x.effective_end is null
  );

-- ── 2) Close any leftover Standard rows blocked by an existing target price ───
with tgt as (
  select id from public.subs_vendors
  where lower(trim(company_name)) = lower('Irrigation Express - Simple Turf')
  limit 1
),
std_ids as (
  select id from public.subs_vendors
  where lower(trim(company_name)) in ('standard', 'unspecified')
),
turf_mat as (
  select m.id from public.material m
  join public.category c on c.id = m.category_id
  where lower(trim(c.name)) = 'artificial turf'
)
update public.material_price mp
set effective_end = current_date
where mp.effective_end is null
  and mp.vendor_id in (select id from std_ids)
  and mp.material_id in (select id from turf_mat)
  and exists (
    select 1 from public.material_price x
    where x.material_id = mp.material_id
      and x.vendor_id = (select id from tgt)
      and x.effective_end is null
  );
