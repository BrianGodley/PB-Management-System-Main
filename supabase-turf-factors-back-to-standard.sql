-- The bulk "move Artificial Turf -> Simple Turf" swept up the 'Turf - ...'
-- estimating-factor / spec rows (roll width, divisors, depths, install
-- materials, infill). The module reads those as Standard-map values
-- (fetchStandardRateMap only maps the Standard-vendor price), so on the vendor
-- they read 0 and zero out Turf Installation / base / cut-seam / infill.
-- This re-points ONLY those factor rows back to the Standard vendor. Real turf
-- products (sub_category 'Turf Material') stay under Simple Turf. Idempotent.
with std as (
  select id from public.subs_vendors
  where lower(trim(company_name)) in ('standard', 'unspecified')
  order by (lower(trim(company_name)) = 'standard') desc
  limit 1
),
factor_mat as (
  select m.id
  from public.material m
  join public.category c on c.id = m.category_id
  left join public.subcategory s on s.id = m.subcategory_id
  where lower(trim(c.name)) = 'artificial turf'
    and m.description like 'Turf - %'
    and coalesce(lower(trim(s.name)), '') <> 'turf material'
)
update public.material_price mp
set vendor_id = (select id from std)
where mp.effective_end is null
  and mp.material_id in (select id from factor_mat)
  and mp.vendor_id <> (select id from std)
  and not exists (
    select 1 from public.material_price x
    where x.material_id = mp.material_id
      and x.vendor_id = (select id from std)
      and x.effective_end is null
  );
