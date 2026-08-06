-- ─────────────────────────────────────────────────────────────────────────────
-- Vendor-backed "Basic Materials" catalog.
--
-- Shared rows that multiple estimator modules will resolve against, so a vendor
-- price change on concrete / base / sand propagates everywhere at once instead
-- of being trapped in per-module hardcoded fallbacks.
--
-- ADDITIVE + IDEMPOTENT: creates new rows in a new category ('Basic Materials').
-- Nothing existing changes and no module consumes these yet, so estimates are
-- unaffected until a module is deliberately repointed. Run on BOTH DBs.
--
-- Prices below are the CURRENT fallback values and are consistent across the
-- modules that use them:
--   • Concrete Ready Mix (Truck) $185/CY  — Walls + Concrete agree
--   • Base / Class II Roadbase   $7.50/ton — Paver + Concrete agree
--   • Bedding Sand               $25.30/ton — Paver
--   • Concrete Hand Mix          $92/CY    — Walls
--
-- DELIBERATELY OMITTED (prices/units conflict across modules — need a decision
-- before they can be unified into one shared row):
--   • Rebar  — Walls $1.399/LF, Columns $0.80/LF, Concrete $0.8625/SF (per-slab)
--   • Grout  — Walls pump setup $402.50 + $9.20/CY, Columns fill/grout $0.75/block
-- ─────────────────────────────────────────────────────────────────────────────
insert into public.material_rates
  (tenant_id, category, sub_category, subcategory, name, unit, unit_cost, vendor_id)
select
  t.tenant_id,
  'Basic Materials',
  'Aggregate & Concrete',
  'Aggregate & Concrete',
  x.name, x.unit, x.unit_cost,
  v.id                                   -- Unspecified vendor if it exists, else NULL (= Unspecified)
from (values
  ('Concrete - Ready Mix (Truck)', 'CY',  185.00),
  ('Concrete - Hand Mix',          'CY',   92.00),
  ('Base - Class II Roadbase',     'ton',    7.50),
  ('Bedding Sand',                 'ton',   25.30)
) as x(name, unit, unit_cost)
cross join (
  select tenant_id from public.material_rates where tenant_id is not null limit 1
) t
left join lateral (
  select id from public.subs_vendors
  where lower(trim(company_name)) = 'unspecified'
  limit 1
) v on true
on conflict (tenant_id, name, category) do nothing;

-- Verify:
-- select name, unit, unit_cost, vendor_id from public.material_rates
--  where category = 'Basic Materials' order by name;
