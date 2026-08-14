-- ============================================================================
-- Pool: guarantee every rate that USED to have a code fallback now exists in a
-- table (so deleting the fallbacks from PoolModule.jsx / PoolSummary.jsx can't
-- zero out an estimate). Values are the OLD code fallbacks. Inserts ONLY where
-- the rate is missing (WHERE NOT EXISTS) — never overwrites a value you've
-- already set. Run on prod (and staging) BEFORE deploying the fallback-free
-- Pool module.
--
-- Read paths in the module:
--   labor_rates  (category 'Pool')      → laborRates[...] and materialPrices[...]
--   misc_rates   (category 'Pool')      → materialPrices[...]  (equipment, coeffs, $/unit)
--   subcontractor_rates (category 'Pool') → subRates[...], KEYED BY the `trade` column
--   labor_rates  (category 'Utilities') → shared Electrical & Plumbing labor
--   misc_rates   (category 'Utilities') → shared Electrical & Plumbing material
-- Tenant is stamped from an existing Pool labor row (single live tenant).
-- ============================================================================

-- ── 1. Pool labor coefficients → labor_rates (category 'Pool') ──────────────
insert into public.labor_rates (tenant_id, name, rate, category)
select t.tid, v.name, v.rate, 'Pool'
from (select tenant_id tid from public.labor_rates where category = 'Pool' limit 1) t
cross join (values
  -- Excavation CY/hr (EXCAVATION_LABOR_NAME → EXCAVATION_RATES)
  ('Excavation - IH Bobcat 72',      7.33),
  ('Excavation - IH Bobcat 64',      7.14),
  ('Excavation - Rental 48',         7.33),
  ('Excavation - Rental 42',         7.33),
  ('Excavation - Medium Excavator', 29.75),
  ('Excavation - Large Excavator',  25.5),
  ('Excavation - Hand Dig',          0.5),
  -- Waterline tile install (hrs/LF)
  ('Tile - 6" Squares',   0.356),
  ('Tile - 3" Squares',   0.4),
  ('Tile - 2" Squares',   0.421),
  ('Tile - 1" Squares',   0.457),
  ('Tile - Segmental',    0.533),
  ('Tile - Multi-Piece',  0.457),
  ('Tile - Glass Tile',   0.533),
  -- Spillway labor (hrs/LF)
  ('Spillway - TILE',      1.25),
  ('Spillway - FLAGSTONE', 0.5),
  -- Coping labor (hrs/LF)
  ('Coping - Paver Bullnose',            0.4),
  ('Coping - Travertine 12"x12"',        0.444),
  ('Coping - Precast Concrete',          0.444),
  ('Coping - Arizona Flagstone Eased',   0.5),
  ('Coping - Other Flagstone',           0.533),
  ('Coping - Pacific Clay',              0.41),
  ('Coping - Pour In Place Sand Finish', 0.727),
  -- Raised surface labor (hrs/SF)
  ('Raised - 6" Square Tile',        0.356),
  ('Raised - 3" Square Tile',        0.4),
  ('Raised - 2" Square Tile',        0.421),
  ('Raised - 1" Square Tile',        0.457),
  ('Raised - Segmental Tile',        0.533),
  ('Raised - Multi-Piece Tile',      0.457),
  ('Raised - Glass Tile',            0.533),
  ('Raised - MSI Ledgerstone',       0.2),
  ('Raised - Flat Flagstone Arizona',0.22),
  ('Raised - Flat Flagstone Other',  0.22),
  ('Raised - Stucco',                0.1),
  ('Raised - Integral Color Stucco', 0.11),
  -- In-house pool plumbing base hours + per-corner labor coefficient
  ('Pool Plumbing - Base Hours', 16),
  ('Pool Raised Corner Labor',    0.5)
) as v(name, rate)
where not exists (
  select 1 from public.labor_rates l where l.name = v.name and l.category = 'Pool'
);

-- ── 2. Pool material / misc coefficients → misc_rates (category 'Pool') ─────
--    Guard against an existing material.description with the same name (the
--    equipment models may live as catalog materials).
insert into public.misc_rates (tenant_id, name, rate, category)
select t.tid, v.name, v.rate, 'Pool'
from (select tenant_id tid from public.labor_rates where category = 'Pool' limit 1) t
cross join (values
  -- Tunable estimating coefficients
  ('Pool Avg Depth Ratio',            0.6666666667),
  ('Pool Excavation Swell Factor',    1.07),
  ('Pool Shotcrete Shell Thickness',  0.5),
  ('Pool Shotcrete Swell Factor',     1.07),
  ('Pool Tile SF per LF',             0.5),
  ('Pool Raised Corner Mat Factor',   0.2),
  -- Spillway material ($/LF)
  ('Spillway TILE',      30),
  ('Spillway FLAGSTONE', 24),
  -- Coping material ($/LF)
  ('Coping Mat - Paver Bullnose',             8.5),
  ('Coping Mat - Travertine 12"x12"',        13),
  ('Coping Mat - Precast Concrete',          50),
  ('Coping Mat - Arizona Flagstone Eased',   13),
  ('Coping Mat - Other Flagstone',           18),
  ('Coping Mat - Pacific Clay',              12),
  ('Coping Mat - Pour In Place Sand Finish',  7.5),
  -- Raised surface material ($/SF)
  ('Raised Mat - 6" Square Tile',         6.5),
  ('Raised Mat - 3" Square Tile',         6.5),
  ('Raised Mat - 2" Square Tile',         6.5),
  ('Raised Mat - 1" Square Tile',         6.5),
  ('Raised Mat - Segmental Tile',         6.5),
  ('Raised Mat - Multi-Piece Tile',       6.5),
  ('Raised Mat - Glass Tile',            12),
  ('Raised Mat - MSI Ledgerstone',        5.5),
  ('Raised Mat - Flat Flagstone Arizona', 4.5),
  ('Raised Mat - Flat Flagstone Other',   6),
  ('Raised Mat - Stucco',                 0.5),
  ('Raised Mat - Integral Color Stucco',  0.75),
  -- In-house pool plumbing materials ($)
  ('Pool Plumbing - Materials', 350),
  -- Pool equipment unit prices (EQUIPMENT_CATALOG, model → price; 'Other' skipped)
  ('VSHP270AUT', 1498),
  ('VSHP33AUT',  1650),
  ('CV340',      1139),
  ('CV460',      1259),
  ('CV580',      1462),
  ('VersaTemp',  4180),
  ('JXi400N',    2980),
  ('APUREM',     2047),
  ('1'' - 1" Lip',   289),
  ('2'' - 1" Lip',   349),
  ('3'' - 1" Lip',   429),
  ('4'' - 1" Lip',   559),
  ('5'' - 1" Lip',   699),
  ('6'' - 1" Lip',   899),
  ('1'' - 6" Lip',   329),
  ('2'' - 6" Lip',   399),
  ('3'' - 6" Lip',   479),
  ('4'' - 6" Lip',   609),
  ('5'' - 6" Lip',   749),
  ('6'' - 6" Lip',   949),
  ('1'' - 12" Lip',  369),
  ('2'' - 12" Lip',  449),
  ('3'' - 12" Lip',  529),
  ('4'' - 12" Lip',  659),
  ('5'' - 12" Lip',  799),
  ('6'' - 12" Lip',  999),
  ('RGBW 50''',  634),
  ('RGBW 100''', 743),
  ('RS-P4',  2113),
  ('RS-PS4', 2024),
  ('RS-P6',  3048),
  ('RS-PS6', 3048),
  ('RS-PS8', 3853)
) as v(name, rate)
where not exists (select 1 from public.misc_rates m where m.name = v.name and m.category = 'Pool')
  and not exists (select 1 from public.material mat where mat.description = v.name);

-- ── 3. Pool subcontractor flats → subcontractor_rates (category 'Pool') ─────
--    The module reads these keyed by the `trade` column (sr[r.trade]); set the
--    label company_name to the item text too. Guard on trade + category.
insert into public.subcontractor_rates (tenant_id, company_name, trade, rate, unit, category)
select t.tid, v.name, v.name, v.rate, v.unit, 'Pool'
from (select tenant_id tid from public.labor_rates where category = 'Pool' limit 1) t
cross join (values
  ('Shotcrete Material',                200,  'Cu Yd'),
  ('Shotcrete Labor',                    85,  'Cu Yd'),
  ('Shotcrete Minimum Labor',          3500,  'flat'),
  ('Interior Finish - White Plaster',    45,  'Sq Ft'),
  ('Interior Finish - Quartzscapes',     87,  'Sq Ft'),
  ('Interior Finish - Stonescapes',      83,  'Sq Ft'),
  ('Plumbing Pool Only',               4500,  'flat'),
  ('Plumbing Pool + Spa',              6000,  'flat'),
  ('Plumbing Over 20ft Add',            300,  'flat'),
  ('Plumbing Remodel Add',              200,  'flat'),
  ('Plumbing Extra Light',              150,  'Each'),
  ('Plumbing Sheer Descent',            450,  'Each'),
  ('Steel Per LF',                        8,  'Ln Ft'),
  ('Steel Spa Bonus',                   200,  'flat')
) as v(name, rate, unit)
where not exists (
  select 1 from public.subcontractor_rates s where s.trade = v.name and s.category = 'Pool'
);

-- ── 4. Shared Electrical & Plumbing labor → labor_rates (category 'Utilities')
--    These are read from materialPrices[laborDbName] which merges labor_rates
--    for 'Utilities'. Same rows the Utilities module uses — seeded here only as
--    a safety net (never overwrites).
insert into public.labor_rates (tenant_id, name, rate, category)
select t.tid, v.name, v.rate, 'Utilities'
from (select tenant_id tid from public.labor_rates where category = 'Pool' limit 1) t
cross join (values
  ('PVC Conduit with Electrical - Labor Rate',        0.05),
  ('1-1/2" Poly Gas Pipe - Labor Rate',               0.05),
  ('1" Black Iron Gas Pipe - Labor Rate',             0.15),
  ('1-1/2" Black Iron Gas Pipe - Labor Rate',         0.2),
  ('2" Black Iron Gas Pipe - Labor Rate',             0.25),
  ('12" Single Gas Ring - Labor Rate',                2),
  ('18" Single Gas Ring - Labor Rate',                2),
  ('24" Single Gas Ring - Labor Rate',                2),
  ('24" Double Gas Ring - Labor Rate',                2),
  ('2'' Straight Gas Bar - Labor Rate',               2),
  ('3'' Straight Gas Bar - Labor Rate',               2.5),
  ('4'' Straight Gas Bar - Labor Rate',               3),
  ('Gas Shut-Off Valve - Labor Rate',                 2),
  ('Electric Sub-panel - Labor Rate',                 4.5),
  ('Electric Disconnect - Labor Rate',                2.5),
  ('GFCI Protected Receptacles - Labor Rate',         2),
  ('Bubble Covers for Receptacles - Labor Rate',      0.25),
  ('Infratech W2024SS 2000W 240V Heater (Stainless) - Labor Rate', 6),
  ('Infratech W39 Flush Mount Frame - Labor Rate',    2),
  ('Infratech Single Duplex Switch in Surface Mount Gang Box - Labor Rate', 2)
) as v(name, rate)
where not exists (
  select 1 from public.labor_rates l where l.name = v.name and l.category = 'Utilities'
);

-- ── 5. Shared Electrical & Plumbing material → misc_rates (category 'Utilities')
--    Read from materialPrices[dbName] when there's no vendor catalog row. Guard
--    against an existing material.description (these usually live in the catalog).
insert into public.misc_rates (tenant_id, name, rate, category)
select t.tid, v.name, v.rate, 'Utilities'
from (select tenant_id tid from public.labor_rates where category = 'Pool' limit 1) t
cross join (values
  ('PVC Conduit with Electrical',      1.92),
  ('1-1/2" Poly Gas Pipe',             4.25),
  ('1" Black Iron Gas Pipe',           2.76),
  ('1-1/2" Black Iron Gas Pipe',       4.23),
  ('2" Black Iron Gas Pipe',           5.72),
  ('12" Single Gas Ring',             61.75),
  ('18" Single Gas Ring',             84.75),
  ('24" Single Gas Ring',            107.75),
  ('24" Double Gas Ring',            163.25),
  ('2'' Straight Gas Bar',            35.5),
  ('3'' Straight Gas Bar',            56.0),
  ('4'' Straight Gas Bar',            68.5),
  ('Gas Shut-Off Valve',              89.7),
  ('Electric Sub-panel',             300),
  ('Electric Disconnect',            150),
  ('GFCI Protected Receptacles',      86.25),
  ('Bubble Covers for Receptacles',   19.19),
  ('Infratech W2024SS 2000W 240V Heater (Stainless)', 725.22),
  ('Infratech W39 Flush Mount Frame', 572.26),
  ('Infratech Single Duplex Switch in Surface Mount Gang Box', 206.11)
) as v(name, rate)
where not exists (select 1 from public.misc_rates m where m.name = v.name and m.category = 'Utilities')
  and not exists (select 1 from public.material mat where mat.description = v.name);

-- Verify:
-- select name, rate from public.labor_rates where category='Pool' order by name;
-- select name, rate from public.misc_rates  where category='Pool' order by name;
-- select trade, rate from public.subcontractor_rates where category='Pool' order by trade;
-- select name, rate from public.labor_rates where category='Utilities' order by name;
-- select name, rate from public.misc_rates  where category='Utilities' order by name;
