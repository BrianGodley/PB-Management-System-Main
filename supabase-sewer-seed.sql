-- ─────────────────────────────────────────────────────────────────────────────
-- Utilities → Sewer section seed (Standard prices + labor coefficients)
--
-- Makes the new Sewer Lines / Sewer Sinks items editable in Master Rates and
-- appear under their sub_category markers. The module already calculates with
-- code fallbacks, so this is additive/idempotent — safe to run once on prod.
--
-- ABS pipe labor = the matching Drainage SDR-35 rate + 50%
--   3": 0.045 → 0.0675   4": 0.0495 → 0.07425 (hrs/LF)
-- Sinks: 6 labor hrs each; Turbo $397, Kraus $585.
-- ─────────────────────────────────────────────────────────────────────────────

-- Standard (vendor_id NULL) material rows, per tenant ----------------------------
insert into public.material_rates (tenant_id, category, sub_category, name, unit_cost, vendor_id)
select t.tenant_id, 'Utilities', v.marker, v.name, v.cost, null
  from (select distinct tenant_id from public.material_rates where tenant_id is not null) t
  cross join (values
    ('Sewer Lines', '3" ABS Sewer Pipe',                 4.50),
    ('Sewer Lines', '4" ABS Sewer Pipe',                 6.00),
    ('Sewer Sinks', 'Turbo 2" x 14" Sink w/fittings',  397.00),
    ('Sewer Sinks', 'Kraus 15" Drop Sink w/fittings',  585.00)
  ) as v(marker, name, cost)
 where not exists (
   select 1 from public.material_rates m
    where m.tenant_id = t.tenant_id and m.category = 'Utilities'
      and m.name = v.name and m.vendor_id is null
 );

-- Labor coefficient rows, per tenant --------------------------------------------
insert into public.labor_rates (tenant_id, category, name, rate)
select t.tenant_id, 'Utilities', v.name, v.rate
  from (select distinct tenant_id from public.material_rates where tenant_id is not null) t
  cross join (values
    ('3" ABS Sewer Pipe - Labor Rate',                0.0675),
    ('4" ABS Sewer Pipe - Labor Rate',                0.07425),
    ('Turbo 2" x 14" Sink w/fittings - Labor Rate',   6),
    ('Kraus 15" Drop Sink w/fittings - Labor Rate',   6)
  ) as v(name, rate)
 where not exists (
   select 1 from public.labor_rates l
    where l.tenant_id = t.tenant_id and l.category = 'Utilities' and l.name = v.name
 );

-- Optional: to make "Barbecues Galore" / "Home Depot" selectable as vendors on
-- Sewer Sinks, tag those vendors' supplied_categories with 'Sewer Sinks' and add
-- a vendor-priced material_rates row (vendor_id = that vendor). Left out here so
-- no vendor is created blindly — say the word and I'll add that block.
