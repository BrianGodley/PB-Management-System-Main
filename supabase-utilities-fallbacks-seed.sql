-- ============================================================================
-- Utilities: guarantee every rate that USED to have a code fallback now exists
-- in a table, so deleting the module's hardcoded fallbacks can't zero out an
-- estimate. Values are the OLD code fallbacks. Inserts ONLY where the rate is
-- missing (WHERE NOT EXISTS) — never overwrites a value you've already set. Run
-- on prod (and staging) BEFORE deploying the fallback-free UtilitiesModule.
--
-- Read map (must match the module):
--   Trench min/cf + per-unit labor (…- Labor Rate) → labor_rates. The module
--     reads them via materialPrices = fetchStandardRateMap(['Utilities']), which
--     merges labor_rates into the map by name.
--   Material $/unit (pipe/fixture/add-item) + Sub Trench $/LF → misc_rates,
--     guarded vs an existing material.description (a catalog Standard product of
--     the same name wins). Same map read (fetchStandardRateMap folds misc_rates
--     in), so a name resolves whether it lives in the catalog or misc_rates.
-- ============================================================================

-- ── Labor coefficients (labor_rates, category 'Utilities') ──────────────────
insert into public.labor_rates (tenant_id, name, rate, category)
select t.tid, v.name, v.rate, 'Utilities'
from (select tenant_id tid from public.labor_rates where category = 'Utilities' limit 1) t
cross join (values
  ('Utilities Trench Excavation',                                            10),
  ('Utilities Hand Excavation',                                              12.5),
  ('PVC Conduit with Electrical - Labor Rate',                               0.05),
  ('1-1/2" Poly Gas Pipe - Labor Rate',                                      0.05),
  ('1" Black Iron Gas Pipe - Labor Rate',                                    0.15),
  ('1-1/2" Black Iron Gas Pipe - Labor Rate',                                0.2),
  ('2" Black Iron Gas Pipe - Labor Rate',                                    0.25),
  ('12" Single Gas Ring - Labor Rate',                                       2),
  ('18" Single Gas Ring - Labor Rate',                                       2),
  ('24" Single Gas Ring - Labor Rate',                                       2),
  ('24" Double Gas Ring - Labor Rate',                                       2),
  ('2'' Straight Gas Bar - Labor Rate',                                      2),
  ('3'' Straight Gas Bar - Labor Rate',                                      2.5),
  ('4'' Straight Gas Bar - Labor Rate',                                      3),
  ('Gas Shut-Off Valve - Labor Rate',                                        2),
  ('Electric Sub-panel - Labor Rate',                                        4.5),
  ('Electric Disconnect - Labor Rate',                                       2.5),
  ('GFCI Protected Receptacles - Labor Rate',                                2),
  ('Bubble Covers for Receptacles - Labor Rate',                             0.25),
  ('Infratech W2024SS 2000W 240V Heater (Stainless) - Labor Rate',           6),
  ('Infratech W39 Flush Mount Frame - Labor Rate',                           2),
  ('Infratech Single Duplex Switch in Surface Mount Gang Box - Labor Rate',  2),
  ('3" ABS Sewer Pipe - Labor Rate',                                         0.0675),
  ('4" ABS Sewer Pipe - Labor Rate',                                         0.07425),
  ('Curb Core - Labor Rate',                                                 2),
  ('Hydrocut Under Hardscape - Labor Rate',                                  2)
) as v(name, rate)
where not exists (
  select 1 from public.labor_rates l where l.name = v.name and l.category = 'Utilities'
);

-- ── Material $/unit + Sub Trench $/LF (misc_rates, category 'Utilities') ─────
-- Guarded vs an existing material.description so a catalog product of the same
-- name stays the source of truth for its price.
insert into public.misc_rates (tenant_id, name, rate, category)
select t.tid, v.name, v.rate, 'Utilities'
from (select tenant_id tid from public.labor_rates where category = 'Utilities' limit 1) t
cross join (values
  ('PVC Conduit with Electrical',                              1.92),
  ('1-1/2" Poly Gas Pipe',                                     4.25),
  ('1" Black Iron Gas Pipe',                                   2.76),
  ('1-1/2" Black Iron Gas Pipe',                               4.23),
  ('2" Black Iron Gas Pipe',                                   5.72),
  ('12" Single Gas Ring',                                      61.75),
  ('18" Single Gas Ring',                                      84.75),
  ('24" Single Gas Ring',                                      107.75),
  ('24" Double Gas Ring',                                      163.25),
  ('2'' Straight Gas Bar',                                     35.5),
  ('3'' Straight Gas Bar',                                     56.0),
  ('4'' Straight Gas Bar',                                     68.5),
  ('Gas Shut-Off Valve',                                       89.7),
  ('Electric Sub-panel',                                       300),
  ('Electric Disconnect',                                      150),
  ('GFCI Protected Receptacles',                               86.25),
  ('Bubble Covers for Receptacles',                            19.19),
  ('Infratech W2024SS 2000W 240V Heater (Stainless)',          725.22),
  ('Infratech W39 Flush Mount Frame',                          572.26),
  ('Infratech Single Duplex Switch in Surface Mount Gang Box', 206.11),
  ('3" ABS Sewer Pipe',                                        4.5),
  ('4" ABS Sewer Pipe',                                        6.0),
  ('Curb Core',                                                250),
  ('Hydrocut Under Hardscape',                                 50),
  ('Utilities Sub Trench - Per LF',                            12)
) as v(name, rate)
where not exists (select 1 from public.misc_rates m where m.name = v.name and m.category = 'Utilities')
  and not exists (select 1 from public.material mat where mat.description = v.name);

-- Verify:
-- select name, rate from public.labor_rates where category='Utilities' order by name;
-- select name, rate from public.misc_rates  where category='Utilities' order by name;
