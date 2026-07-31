-- ============================================================================
-- Lighting → per-vendor catalog (like Pavers)
-- ----------------------------------------------------------------------------
-- Turns Lighting into the standard vendor catalog: items live in material_rates
-- (category='Lighting') under a subcategory ('Light Fixture' | 'Transformer' |
-- 'Wire'), optionally tagged to a vendor (vendor_id). Adds lighting-specific
-- attribute columns the estimator needs:
--   • watts / va        — per-each electrical load (fixtures) for VA sizing
--   • labor_hrs_ea       — in-house install hours per each
--   • sub_price_ea       — subcontractor flat price per each (Sub tab)
-- Seeds the current built-in items as House rows (vendor_id NULL) so nothing is
-- lost; existing Lighting rows are updated in place (attributes only, prices
-- untouched). Idempotent. Run on STAGING first, then PROD.
-- ============================================================================

alter table public.material_rates add column if not exists watts        numeric;
alter table public.material_rates add column if not exists va           numeric;
alter table public.material_rates add column if not exists labor_hrs_ea numeric;
alter table public.material_rates add column if not exists sub_price_ea numeric;

-- Built-in lighting catalog (name matches the historical dbName so existing
-- House price lookups keep working).
with seed(name, subcat, unit, cost, watts, va, labor) as (
  values
    -- Fixtures
    ('Spot Light',          'Light Fixture', 'ea', 99.00::numeric,  4.5::numeric,  7.5::numeric, 0.5::numeric),
    ('Flood Light',         'Light Fixture', 'ea', 99.00,           4.5,           7.5,          0.5),
    ('Wall Washer Light',   'Light Fixture', 'ea', 99.00,           4.5,           7.5,          0.5),
    ('Path Light',          'Light Fixture', 'ea', 135.45,          4.1,           5.8,          0.5),
    ('Step Light',          'Light Fixture', 'ea', 67.05,           0.75,          1.3,          0.5),
    ('Bistro Lighting',     'Light Fixture', 'LF', 11.52,           1.0,           1.0,          0.125),
    -- Transformers
    ('Transformer 100W',    'Transformer',   'ea', 205.50,          null,          null,         0.25),
    ('Transformer 200W',    'Transformer',   'ea', 222.00,          null,          null,         0.25),
    ('Transformer 300W',    'Transformer',   'ea', 237.00,          null,          null,         0.25),
    ('Transformer 600W',    'Transformer',   'ea', 367.50,          null,          null,         0.25),
    ('Transformer 900W',    'Transformer',   'ea', 520.50,          null,          null,         0.25),
    ('Transformer 1200W',   'Transformer',   'ea', 666.00,          null,          null,         0.25),
    -- Wire & other
    ('12x2 E. Wiring 250'' Roll', 'Wire',    'roll', 115.00,        null,          null,         null),
    ('12x2 E. Wiring',      'Wire',          'LF', 0.35,            null,          null,          null),
    ('Fx Timer',            'Wire',          'ea', 16.26,           null,          null,          null),
    ('Bistro Wire',         'Wire',          'LF', 4.00,            null,          null,          null)
)
-- 1) Insert any missing built-in items as House rows (vendor_id NULL) per tenant
insert into public.material_rates
  (tenant_id, category, subcategory, name, unit, unit_cost, watts, va, labor_hrs_ea)
select t.tenant_id, 'Lighting', s.subcat, s.name, s.unit, s.cost, s.watts, s.va, s.labor
from (select distinct tenant_id from public.material_rates) t
cross join seed s
where not exists (
  select 1 from public.material_rates mr
  where mr.tenant_id = t.tenant_id and mr.category = 'Lighting' and mr.name = s.name
);

-- 2) Backfill attributes on any pre-existing Lighting rows (don't touch prices)
with seed(name, subcat, unit, cost, watts, va, labor) as (
  values
    ('Spot Light',          'Light Fixture', 'ea', 99.00::numeric,  4.5::numeric,  7.5::numeric, 0.5::numeric),
    ('Flood Light',         'Light Fixture', 'ea', 99.00,           4.5,           7.5,          0.5),
    ('Wall Washer Light',   'Light Fixture', 'ea', 99.00,           4.5,           7.5,          0.5),
    ('Path Light',          'Light Fixture', 'ea', 135.45,          4.1,           5.8,          0.5),
    ('Step Light',          'Light Fixture', 'ea', 67.05,           0.75,          1.3,          0.5),
    ('Bistro Lighting',     'Light Fixture', 'LF', 11.52,           1.0,           1.0,          0.125),
    ('Transformer 100W',    'Transformer',   'ea', 205.50,          null,          null,         0.25),
    ('Transformer 200W',    'Transformer',   'ea', 222.00,          null,          null,         0.25),
    ('Transformer 300W',    'Transformer',   'ea', 237.00,          null,          null,         0.25),
    ('Transformer 600W',    'Transformer',   'ea', 367.50,          null,          null,         0.25),
    ('Transformer 900W',    'Transformer',   'ea', 520.50,          null,          null,         0.25),
    ('Transformer 1200W',   'Transformer',   'ea', 666.00,          null,          null,         0.25),
    ('12x2 E. Wiring 250'' Roll', 'Wire',    'roll', 115.00,        null,          null,         null),
    ('12x2 E. Wiring',      'Wire',          'LF', 0.35,            null,          null,          null),
    ('Fx Timer',            'Wire',          'ea', 16.26,           null,          null,          null),
    ('Bistro Wire',         'Wire',          'LF', 4.00,            null,          null,          null)
)
update public.material_rates mr
set subcategory  = coalesce(mr.subcategory, s.subcat),
    watts        = coalesce(mr.watts, s.watts),
    va           = coalesce(mr.va, s.va),
    labor_hrs_ea = coalesce(mr.labor_hrs_ea, s.labor)
from seed s
where mr.category = 'Lighting' and mr.name = s.name;
