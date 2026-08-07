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
-- Canonical values set with Brian 2026-08:
--   • Rebar $1.388/LF — used by Walls, Columns, and Concrete. Concrete converts
--     its per-SF takeoff to LF using 0.59 LF/SF @ 24" OC or 1.20 LF/SF @ 12" OC.
--   • Grout is ONE material item; each module keeps its own quantity formula.
--     The grout PUMP is a single shared rate (setup + per-CY), same price for
--     Walls and Columns, applied when that item is pumped.
--
-- STILL PENDING: the grout MATERIAL $/unit + unit (Walls currently prices grout
-- at the concrete rate; Columns at $0.75/block). Add once confirmed.
-- ─────────────────────────────────────────────────────────────────────────────
insert into public.material_rates
  (tenant_id, category, sub_category, subcategory, name, unit, unit_cost, vendor_id)
select
  t.tenant_id,
  'Basic Materials',
  x.grp, x.grp,
  x.name, x.unit, x.unit_cost,
  v.id                                   -- Unspecified vendor if it exists, else NULL (= Unspecified)
from (values
  ('Aggregate & Concrete', 'Concrete - Ready Mix (Truck)', 'CY',  185.00),
  ('Aggregate & Concrete', 'Concrete - Hand Mix',          'CY',   92.00),
  ('Aggregate & Concrete', 'Base - Class II Roadbase',     'ton',    7.50),
  ('Aggregate & Concrete', 'Bedding Sand',                 'ton',   25.30),
  ('Reinforcement',        'Rebar',                        'LF',     1.388),
  ('Grout',                'Grout Pump - Setup',           'ea',   402.50),
  ('Grout',                'Grout Pump - Per CY',          'CY',     9.20)
) as x(grp, name, unit, unit_cost)
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
