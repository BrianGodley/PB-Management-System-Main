-- ============================================================================
-- Planting: guarantee every rate that USED to have a code fallback now exists in
-- a table (so deleting the fallbacks can't zero out an estimate). Values are the
-- OLD code fallbacks. Inserts ONLY where the rate is missing — never overwrites a
-- value you've already set. Run on prod (and staging) BEFORE deploying the
-- fallback-free PlantingModule / PlantingSummary.
--
-- Each rate goes into the SAME table the module reads from:
--   plant install rate (per-HOUR, keyed by plant type) + till + add-on install
--     labor coefficients                                        → labor_rates
--   plant unit prices (keyed by plant type) + add-on materials  → misc_rates
-- The module loads labor_rates separately (laborRates map) and reads prices out of
-- fetchStandardRateMap (catalog + labor_rates + misc_rates → materialPrices). Plant
-- type names appear in BOTH tables on purpose: labor_rates holds the per-hour rate,
-- misc_rates holds the unit price; they resolve through the two separate maps.
-- ============================================================================

-- ── Labor coefficients → labor_rates (category 'Planting') ───────────────────
-- Plant per-HOUR install rates (plants/hr) + till rates + add-on install rates.
insert into public.labor_rates (tenant_id, name, rate, category)
select t.tid, v.name, v.rate, 'Planting'
from (select tenant_id tid from public.labor_rates where category = 'Planting' limit 1) t
cross join (values
  -- Small plants (plants/hr)
  ('Flats of Groundcover',  3.125),
  ('Flats of 4" pots',      2.5),
  ('4" pots standard',      35),
  ('4" pots succulents',    35),
  ('6" pots standard',      22.5),
  ('6" pots succulents',    22.5),
  ('1 gallon standard',     8.75),
  ('1 gallon premium',      8.75),
  ('1 gallon succulents',   8.75),
  ('3 gallon standard',     8.75),
  ('5 gallon standard',     5),
  ('5 gallon premium',      5),
  ('5 gallon succulents',   5),
  ('5 gallon bamboo',       5),
  ('5 gallon palm',         5),
  -- Large plants / trees (plants/hr)
  ('15 gallon standard',    1.875),
  ('15 gallon premium',     1.875),
  ('15 gallon succulents',  1.875),
  ('15 gallon fruit',       1.875),
  ('15 gallon palms',       1.875),
  ('24" box standard',      0.5),
  ('24" box premium',       0.5),
  ('24" box fruit',         0.5),
  ('24" box palm',          0.5),
  ('36" box standard',      0.09375),
  ('36" box premium',       0.09375),
  ('36" box fruit',         0.09375),
  ('36" box palm',          0.09375),
  ('48" box standard',      0.0375),
  ('48" box premium',       0.0375),
  ('48" box fruit',         0.0375),
  ('48" box palm',          0.0375),
  -- Till + add-on install rates
  ('Till - Soil Move Rate',      39),
  ('Till - Tilling Rate',        3600),
  ('Till - Amend Rate',          900),
  ('Tree Stakes - Install Rate', 3),
  ('Root Barrier - Install Rate', 20),
  ('Gopher Basket - Install Rate', 2),
  ('Mesh Flat - Install Rate',   0.7),
  ('Jute Fabric - Install Rate', 1.1)
) as v(name, rate)
where not exists (
  select 1 from public.labor_rates l
  where l.name = v.name and l.category = 'Planting'
);

-- ── Material unit prices → misc_rates (category 'Planting') ──────────────────
-- Plant unit prices (keyed by plant type) + add-on material prices. Guarded vs
-- the material catalog too, so an item already priced there is left alone.
insert into public.misc_rates (tenant_id, name, rate, category)
select t.tid, v.name, v.rate, 'Planting'
from (select tenant_id tid from public.labor_rates where category = 'Planting' limit 1) t
cross join (values
  -- Small plant unit prices
  ('Flats of Groundcover',  18.0),
  ('Flats of 4" pots',      20.0),
  ('4" pots standard',      0.0),
  ('4" pots succulents',    7.0),
  ('6" pots standard',      0.0),
  ('6" pots succulents',    12.0),
  ('1 gallon standard',     6.5),
  ('1 gallon premium',      8.0),
  ('1 gallon succulents',   18.0),
  ('3 gallon standard',     7.0),
  ('5 gallon standard',     17.0),
  ('5 gallon premium',      35.0),
  ('5 gallon succulents',   39.0),
  ('5 gallon bamboo',       40.0),
  ('5 gallon palm',         50.0),
  -- Large plant / tree unit prices
  ('15 gallon standard',    52.0),
  ('15 gallon premium',     90.0),
  ('15 gallon succulents',  225.0),
  ('15 gallon fruit',       145.0),
  ('15 gallon palms',       175.0),
  ('24" box standard',      185.0),
  ('24" box premium',       250.0),
  ('24" box fruit',         0.0),
  ('24" box palm',          0.0),
  ('36" box standard',      450.0),
  ('36" box premium',       600.0),
  ('36" box fruit',         0.0),
  ('36" box palm',          0.0),
  ('48" box standard',      800.0),
  ('48" box premium',       0.0),
  ('48" box fruit',         0.0),
  ('48" box palm',          0.0),
  -- Add-on material prices
  ('Tree Stake',            8.5),
  ('Root Barrier 12in',     5.0),
  ('Root Barrier 24in',     7.0),
  ('Gopher Basket 1 Gal',   3.42),
  ('Gopher Basket 5 Gal',   7.78),
  ('Gopher Basket 15 Gal',  10.5),
  ('Mesh Flat',             1.0),
  ('Jute Fabric',           0.4)
) as v(name, rate)
where not exists (select 1 from public.misc_rates m where m.name = v.name and m.category = 'Planting')
  and not exists (select 1 from public.material mat where mat.description = v.name);

-- Verify:
-- select name, rate from public.labor_rates where category='Planting' order by name;
-- select name, rate from public.misc_rates  where category='Planting' order by name;
