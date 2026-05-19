-- ─────────────────────────────────────────────────────────────────────────────
-- Master Rates Seed — DRAFT (running file, will consolidate at end of project)
-- Brings hidden hardcoded labor/material/sub coefficients into the editable
-- catalogs so the inline calculator icons in each estimate module have real
-- rows to read/update.
--
-- Rate names below MUST match the lookup keys the modules use exactly. Each
-- block notes which module(s) reference it. Safe to re-run — uses
-- ON CONFLICT DO NOTHING.
-- ─────────────────────────────────────────────────────────────────────────────


-- ====================================================================
-- DEMO MODULES (HandDemo, SkidSteerDemo, MiniSkidSteerDemo)
-- ====================================================================

-- ── Labor coefficients (labor_rates) ───────────────────────────────────
INSERT INTO public.labor_rates (name, rate, unit, category, notes) VALUES
  -- Hand Demo
  ('Demo - Hand Concrete/Dirt', 0.75,  't/hr',   'Demo', 'Hand demo — concrete & dirt/rock removal rate'),
  ('Demo - Hand Grass',         0.75,  't/hr',   'Demo', 'Hand demo — grass/sod removal rate'),
  ('Demo - Hand Import Base',   5.0,   't/hr',   'Demo', 'Hand demo — import base spread rate'),
  ('Demo - Hand Bucket',        0.38,  't/hr',   'Demo', 'Hand demo — tight-access bucket area rate'),
  ('Demo - Hand Rebar',         0.25,  'min/SF', 'Demo', 'Hand demo — rebar removal add-on (minutes per SF)'),

  -- Skid Steer Demo
  ('Demo - Skid Steer Concrete/Dirt', 2.0,  't/hr', 'Demo', 'Skid steer demo — concrete & dirt rate (includes haul)'),
  ('Demo - Skid Steer Grass',         2.1,  't/hr', 'Demo', 'Skid steer demo — grass/sod rate'),
  ('Demo - Skid Steer Import Base',   10.0, 't/hr', 'Demo', 'Skid steer demo — import base spread rate'),
  ('Demo - SS Compaction',            7.0,  't/hr', 'Demo', 'Skid steer compaction rate'),
  ('Demo - Rebar',                    0.05, 'min/SF', 'Demo', 'Skid steer demo — rebar removal add-on (min/SF)'),

  -- Mini Skid Steer Demo
  ('Demo - Mini Skid Steer Concrete/Dirt', 0.75, 't/hr', 'Demo', 'Mini skid steer — concrete & dirt rate'),
  ('Demo - Mini Skid Steer Grass',         0.75, 't/hr', 'Demo', 'Mini skid steer — grass/sod rate'),
  ('Demo - Mini Skid Steer Import Base',   5.0,  't/hr', 'Demo', 'Mini skid steer — import base spread rate'),
  ('Demo - Mini SS Compaction',            1.23, 't/hr', 'Demo', 'Mini skid steer compaction rate (4" max lift)'),

  -- Shared compaction / vegetation across all 3 demo modules
  ('Demo - JJ Compaction',     1.75, 't/hr',   'Demo', 'Jumping-jack compaction rate'),
  ('Demo - Shrub',             0.75, 'hrs/ea', 'Demo', 'Shrub demo — hours per shrub before access modifier'),
  ('Demo - Stump 1st',         2.5,  'hrs/ea', 'Demo', 'Stump grinding — first stump'),
  ('Demo - Stump Additional',  0.75, 'hrs/ea', 'Demo', 'Stump grinding — each additional stump'),
  ('Demo - Tree Small',        0.1,  'hrs/ft', 'Demo', 'Tree demo — small tree multiplier (hrs per ft of height)'),
  ('Demo - Tree Medium',       0.15, 'hrs/ft', 'Demo', 'Tree demo — medium tree multiplier'),
  ('Demo - Tree Large',        0.2,  'hrs/ft', 'Demo', 'Tree demo — large tree multiplier')
ON CONFLICT DO NOTHING;

-- ── Dump fees (material_rates, category=Demo) ──────────────────────────
INSERT INTO public.material_rates (name, unit_cost, unit, category, notes) VALUES
  ('Dump Fee - Concrete',    36.21,  'ton', 'Demo', 'Dump fee for concrete'),
  ('Dump Fee - Dirt',        36.21,  'ton', 'Demo', 'Dump fee for dirt/rock'),
  ('Dump Fee - Green Waste', 72.19,  'ton', 'Demo', 'Dump fee for grass/sod and tree green waste'),
  ('Dump Fee - Tree/Stump',  125.33, 'ton', 'Demo', 'Dump fee for trees and stumps (Mini SS uses this)'),
  ('Dump Fee - Import Base', 7.50,   'ton', 'Demo', 'Dump fee for import base (Mini SS only)')
ON CONFLICT DO NOTHING;

-- ── Sub haul charges (subcontractor_rates, category=Sub Haul) ──────────
INSERT INTO public.subcontractor_rates (company_name, rate, category, notes) VALUES
  ('Sub Haul - Concrete', 85,  'Sub Haul', '$/1.5T — concrete, misc flat/vert, footing'),
  ('Sub Haul - Dirt',     95,  'Sub Haul', '$/1.5T — dirt/rock, grade cut, bucket areas'),
  ('Sub Haul - Grass',    120, 'Sub Haul', '$/1.5T — grass/sod, trees (green waste)')
ON CONFLICT DO NOTHING;


-- ====================================================================
-- CONCRETE MODULE
-- ====================================================================

-- ── Labor production rates (labor_rates, category=Concrete) ───────────
INSERT INTO public.labor_rates (name, rate, unit, category, notes) VALUES
  ('Concrete - Pour & Finish',      23,   'SF/hr', 'Concrete', 'Concrete pour & finish production rate'),
  ('Concrete - Rebar 24" OC',       60,   'SF/hr', 'Concrete', 'Rebar grid install at 24" on-center'),
  ('Concrete - Form Setting',       18,   'LF/hr', 'Concrete', 'Form/edging setting production rate'),
  ('Concrete - Sleeves',            10,   'LF/hr', 'Concrete', '3" sleeve installation rate'),
  ('Concrete - Sealer Natural',     200,  'SF/hr', 'Concrete', 'Natural sealer application rate'),
  ('Concrete - Sealer Wet-Look',    120,  'SF/hr', 'Concrete', 'Wet-look sealer application rate'),
  ('Concrete - Vapor Barrier',      15,   'SF/hr', 'Concrete', 'Vapor barrier install rate'),
  -- Per-method base install rates (Concrete > Base Install row)
  ('Concrete - Base Skid Steer Good', 10.0, 't/hr', 'Concrete', 'Base install — skid steer with good access'),
  ('Concrete - Base Skid Steer OK',   7.5,  't/hr', 'Concrete', 'Base install — skid steer with limited access'),
  ('Concrete - Base Mini Skid Steer', 5.0,  't/hr', 'Concrete', 'Base install — mini skid steer'),
  ('Concrete - Base Wheelbarrow',     3.34, 't/hr', 'Concrete', 'Base install — wheelbarrow'),
  ('Concrete - Base Hand',            2.5,  't/hr', 'Concrete', 'Base install — hand only')
ON CONFLICT DO NOTHING;

-- ── Material unit costs (material_rates, category=Concrete) ───────────
INSERT INTO public.material_rates (name, unit_cost, unit, category, notes) VALUES
  ('Concrete - Per CY',              185,    'CY',   'Concrete', 'Ready-mix concrete unit cost'),
  ('Concrete - Rebar Price SF',      0.8625, 'SF',   'Concrete', 'Rebar material cost per SF of grid'),
  ('Concrete - Form Lumber LF',      1.73,   'LF',   'Concrete', 'Form lumber per linear foot'),
  ('Concrete - Sleeve Per 10LF',     4.60,   '10LF', 'Concrete', 'Sleeve material cost per 10LF section'),
  ('Concrete - Color Per CY',        28.75,  'CY',   'Concrete', 'Color hardener add per CY'),
  ('Concrete - Sealer Natural 5gal', 150,    '5gal', 'Concrete', 'Natural sealer 5-gallon bucket price'),
  ('Concrete - Sealer Wet 5gal',     190,    '5gal', 'Concrete', 'Wet-look sealer 5-gallon bucket price'),
  ('Concrete - Vapor Barrier SF',    0.22,   'SF',   'Concrete', 'Vapor barrier material per SF'),
  ('Concrete - Import Base',         7.50,   'ton',  'Concrete', 'Base import material per ton')
ON CONFLICT DO NOTHING;

-- ── Sub / equipment costs (subcontractor_rates, category=Concrete) ────
INSERT INTO public.subcontractor_rates (company_name, rate, category, notes) VALUES
  ('Concrete - Pump Flat Fee',      316.25, 'Concrete', 'Concrete pump flat call-out fee'),
  ('Concrete - Pump Per CY',        9.20,   'Concrete', 'Concrete pump per CY'),
  ('Concrete - Sand Finish 400SF',  207,    'Concrete', 'Sand-finish sub price per 400SF unit'),
  ('Concrete - Stamp Sub Flat',     800,    'Concrete', 'Stamp finish sub flat fee (In-House finishing)'),
  ('Concrete - Stamp Sub Per CY',   120,    'Concrete', 'Stamp finish sub per CY (Sub finishing)')
ON CONFLICT DO NOTHING;


-- ====================================================================
-- PAVER MODULE
-- ====================================================================

-- ── Labor production rates (labor_rates, category=Paver) ──────────────
INSERT INTO public.labor_rates (name, rate, unit, category, notes) VALUES
  ('Paver - Install',          20,    'SF/hr',  'Paver', 'Paver install production rate'),
  ('Paver - Straight Cut',     70,    'LF/hr',  'Paver', 'Straight cut rate'),
  ('Paver - Curved Cut',       30,    'LF/hr',  'Paver', 'Curved cut rate'),
  ('Paver - Restraints',       22,    'LF/hr',  'Paver', 'Edge restraints install rate'),
  ('Paver - Sleeves',          10,    'LF/hr',  'Paver', '3" sleeve install rate'),
  ('Paver - Vertical Soldier', 8,     'LF/hr',  'Paver', 'Vertical soldier course install rate'),
  ('Paver - Sealer',           200,   'SF/hr',  'Paver', 'Paver sealer application rate'),
  ('Paver - 80mm Add',         0.15,  'mult',   'Paver', '80mm penalty multiplier on install SF/rate'),
  ('Paver - Stone Add',        0.05,  'hrs/ea', 'Paver', 'Add per inset stone'),
  ('Paver - Color Add',        0.05,  'hrs/ea', 'Paver', 'Add per extra paver color'),
  ('Paver - Poly Sand Spread', 0.004, 'hrs/SF', 'Paver', 'Polymeric sand spread/sweep'),
  ('Paver - Base Skid Steer Good', 10.0, 't/hr', 'Paver', 'Base install — skid steer with good access'),
  ('Paver - Base Skid Steer OK',   7.5,  't/hr', 'Paver', 'Base install — skid steer with limited access'),
  ('Paver - Base Mini Skid Steer', 5.0,  't/hr', 'Paver', 'Base install — mini skid steer'),
  ('Paver - Base Hand',            2.5,  't/hr', 'Paver', 'Base install — hand only')
ON CONFLICT DO NOTHING;

-- ── Material unit costs (material_rates, category=Paver) ──────────────
INSERT INTO public.material_rates (name, unit_cost, unit, category, notes) VALUES
  ('Paver - Base Rock',          7.50,   'ton',    'Paver', 'Base rock cost per ton'),
  ('Paver - Bedding Sand',       25.30,  'ton',    'Paver', 'Bedding sand cost per ton'),
  ('Paver - Joint Sand',         0.05,   'SF',     'Paver', 'Joint sand per SF of pavers'),
  ('Paver - Poly Sand',          0.56,   'SF',     'Paver', 'Polymeric sand material per SF'),
  ('Paver - Sealer',             0.63,   'SF',     'Paver', 'Sealer material per SF'),
  ('Paver - Restraint Concrete', 1.38,   'LF',     'Paver', 'Restraint concrete per LF'),
  ('Paver - Sleeves',            0.46,   'LF',     'Paver', 'Sleeve material per LF'),
  ('Paver - Pallet Charge',      51.75,  'pallet', 'Paver', 'Paver pallet handling charge'),
  ('Paver - Delivery',           442.75, 'flat',   'Paver', 'Paver delivery flat fee')
ON CONFLICT DO NOTHING;


-- ====================================================================
-- STEPS MODULE
-- ====================================================================

INSERT INTO public.labor_rates (name, rate, unit, category, notes) VALUES
  ('Steps - Straight',          1.5, 'LF/hr', 'Steps', 'Paver steps — straight install rate'),
  ('Steps - Curved',            1.0, 'LF/hr', 'Steps', 'Paver steps — curved install rate'),
  ('Steps - Concrete Straight', 1.0, 'LF/hr', 'Steps', 'Concrete steps — straight install rate'),
  ('Steps - Concrete Curved',   0.5, 'LF/hr', 'Steps', 'Concrete steps — curved install rate')
ON CONFLICT DO NOTHING;

INSERT INTO public.material_rates (name, unit_cost, unit, category, notes) VALUES
  ('Steps - Concrete', 12.00, 'LF', 'Steps', 'Concrete material per LF of step')
ON CONFLICT DO NOTHING;


-- ====================================================================
-- WALLS MODULE
-- ====================================================================

-- ── Labor rates (labor_rates, category=Walls) ─────────────────────────
INSERT INTO public.labor_rates (name, rate, unit, category, notes) VALUES
  ('Wall Dig Footing Labor Rate',     4.0,    'CF/hr',  'Walls', 'Footing dig rate (CF per hour)'),
  ('Wall Set Rebar Labor Rate',       35.0,   'LF/hr',  'Walls', 'Rebar setting rate (LF per hour)'),
  ('Wall Set Block Labor Rate',       10.4,   'blk/hr', 'Walls', 'CMU block setting rate (blocks per hour)'),
  ('Wall Hand Grout Labor Rate',      5.5,    'CF/hr',  'Walls', 'Hand grouting rate (CF per hour)'),
  ('Wall Pump Grout Labor Rate',      81.0,   'CF/hr',  'Walls', 'Pump grouting rate (CF per hour)'),
  ('Wall Setup Clean Labor Rate',     30.0,   'LF/hr',  'Walls', 'Setup & clean rate (LF per hour)'),
  ('Sand Stucco - Wall Labor Rate',   92,     'SF/day', 'Walls', 'Sand stucco SF per crew day'),
  ('Smooth Stucco - Wall Labor Rate', 65,     'SF/day', 'Walls', 'Smooth stucco SF per crew day'),
  ('Ledgerstone - Wall Labor Rate',   24,     'SF/day', 'Walls', 'Ledgerstone veneer SF per crew day'),
  ('Stacked Stone - Wall Labor Rate', 24,     'SF/day', 'Walls', 'Stacked stone veneer SF per crew day'),
  ('Tile - Wall Labor Rate',          0.2867, 'hrs/SF', 'Walls', 'Tile install hours per SF'),
  ('Real Flagstone - Wall Labor Rate',0.4487, 'hrs/SF', 'Walls', 'Real flagstone install hours per SF'),
  ('Real Stone - Wall Labor Rate',    0.8954, 'hrs/SF', 'Walls', 'Real stone install hours per SF')
ON CONFLICT DO NOTHING;

-- ── Material rates (material_rates, category=Walls) ───────────────────
INSERT INTO public.material_rates (name, unit_cost, unit, category, notes) VALUES
  ('Wall Grey Block',          2.59,   'ea',  'Walls', 'CMU grey block unit cost'),
  ('Wall Bondbeam Block',      2.59,   'ea',  'Walls', 'CMU bondbeam block unit cost'),
  ('Wall Rebar',               1.399,  'LF',  'Walls', 'Rebar material per LF'),
  ('Wall Concrete Hand Mix',   92.00,  'CY',  'Walls', 'Hand-mixed concrete per CY'),
  ('Wall Concrete Truck',      185.00, 'CY',  'Walls', 'Ready-mix concrete per CY'),
  ('Wall Grout Pump Setup',    402.50, 'flat','Walls', 'Grout pump call-out flat fee'),
  ('Wall Grout Pump Per Yard', 9.20,   'CY',  'Walls', 'Grout pump per CY'),
  ('Sand Stucco - Wall',       0.00,   'SF',  'Walls', 'Sand stucco material per SF (set to actual)'),
  ('Smooth Stucco - Wall',     0.00,   'SF',  'Walls', 'Smooth stucco material per SF (set to actual)'),
  ('Ledgerstone - Wall',       10.00,  'SF',  'Walls', 'Ledgerstone veneer material per SF'),
  ('Stacked Stone - Wall',     10.00,  'SF',  'Walls', 'Stacked stone veneer material per SF'),
  ('Tile - Wall',              6.50,   'SF',  'Walls', 'Tile material per SF'),
  ('Real Flagstone - Wall',    400.00, 'ton', 'Walls', 'Real flagstone material per ton'),
  ('Real Stone - Wall',        400.00, 'ton', 'Walls', 'Real stone material per ton'),
  ('Wall Cap Flagstone',       500.00, 'ton', 'Walls', 'Flagstone cap material per ton'),
  ('Wall Cap Precast',         50.00,  'ea',  'Walls', 'Precast cap unit cost'),
  ('Wall Cap Bullnose Brick',  5.00,   'LF',  'Walls', 'Bullnose brick cap per LF'),
  ('Wall WP Primer Membrane',  1.80,   'SF',  'Walls', 'Primer + membrane waterproofing per SF'),
  ('Wall WP 3 Coat Roll On',   1.20,   'SF',  'Walls', '3-coat roll-on waterproofing per SF'),
  ('Wall WP Thoroseal Roll On',1.50,   'SF',  'Walls', 'Thoroseal roll-on waterproofing per SF'),
  ('Wall WP Dimple Membrane',  2.10,   'SF',  'Walls', 'Dimple membrane waterproofing per SF')
ON CONFLICT DO NOTHING;


-- ====================================================================
-- PLANTING MODULE
-- ====================================================================

-- ── Labor rates (labor_rates, category=Planting) ──────────────────────
-- Plant type rates are "plants per day"; till/add-on rates vary as noted
INSERT INTO public.labor_rates (name, rate, unit, category, notes) VALUES
  -- Till & amend
  ('Till - Soil Move Rate',         39,   'CY/day',   'Planting', 'Soil move rate (CY per crew day)'),
  ('Till - Tilling Rate',           3600, 'SF/day',   'Planting', 'Tilling rate (SF per crew day)'),
  ('Till - Amend Rate',             900,  'SF/day',   'Planting', 'Amendment spread rate (SF per crew day)'),
  -- Add-ons
  ('Tree Stakes - Install Rate',    24,   'stakes/day', 'Planting', 'Tree stake install rate'),
  ('Root Barrier - Install Rate',   20,   'min/LF',   'Planting', 'Root barrier install rate (any height)'),
  ('Gopher Basket - Install Rate',  2,    'min/ea',   'Planting', 'Gopher basket install rate (any size)'),
  ('Mesh Flat - Install Rate',      0.7,  'min/SF',   'Planting', 'Mesh flat install rate'),
  ('Jute Fabric - Install Rate',    1.1,  'min/SF',   'Planting', 'Jute fabric install rate'),
  -- Small plants — plants per crew day
  ('Flats of Groundcover',          25,   'per day',  'Planting', 'Small plants — flats of groundcover'),
  ('Flats of 4" pots',              20,   'per day',  'Planting', 'Small plants — flats of 4" pots'),
  ('4" pots standard',              280,  'per day',  'Planting', 'Small plants — 4" pots standard'),
  ('4" pots succulents',            280,  'per day',  'Planting', 'Small plants — 4" pots succulents'),
  ('6" pots standard',              180,  'per day',  'Planting', 'Small plants — 6" pots standard'),
  ('6" pots succulents',            180,  'per day',  'Planting', 'Small plants — 6" pots succulents'),
  ('1 gallon standard',             70,   'per day',  'Planting', 'Small plants — 1 gal standard'),
  ('1 gallon premium',              70,   'per day',  'Planting', 'Small plants — 1 gal premium'),
  ('1 gallon succulents',           70,   'per day',  'Planting', 'Small plants — 1 gal succulents'),
  ('3 gallon standard',             70,   'per day',  'Planting', 'Small plants — 3 gal standard'),
  ('5 gallon standard',             40,   'per day',  'Planting', 'Small plants — 5 gal standard'),
  ('5 gallon premium',              40,   'per day',  'Planting', 'Small plants — 5 gal premium'),
  ('5 gallon succulents',           40,   'per day',  'Planting', 'Small plants — 5 gal succulents'),
  ('5 gallon bamboo',               40,   'per day',  'Planting', 'Small plants — 5 gal bamboo'),
  ('5 gallon palm',                 40,   'per day',  'Planting', 'Small plants — 5 gal palm'),
  -- Large plants
  ('15 gallon standard',            15,   'per day',  'Planting', 'Large plants — 15 gal standard'),
  ('15 gallon premium',             15,   'per day',  'Planting', 'Large plants — 15 gal premium'),
  ('15 gallon succulents',          15,   'per day',  'Planting', 'Large plants — 15 gal succulents'),
  ('15 gallon fruit',               15,   'per day',  'Planting', 'Large plants — 15 gal fruit'),
  ('15 gallon palms',               15,   'per day',  'Planting', 'Large plants — 15 gal palms'),
  ('24" box standard',              4,    'per day',  'Planting', 'Large plants — 24" box standard'),
  ('24" box premium',               4,    'per day',  'Planting', 'Large plants — 24" box premium'),
  ('24" box fruit',                 4,    'per day',  'Planting', 'Large plants — 24" box fruit'),
  ('24" box palm',                  4,    'per day',  'Planting', 'Large plants — 24" box palm'),
  ('36" box standard',              0.75, 'per day',  'Planting', 'Large plants — 36" box standard'),
  ('36" box premium',               0.75, 'per day',  'Planting', 'Large plants — 36" box premium'),
  ('36" box fruit',                 0.75, 'per day',  'Planting', 'Large plants — 36" box fruit'),
  ('36" box palm',                  0.75, 'per day',  'Planting', 'Large plants — 36" box palm'),
  ('48" box standard',              0.3,  'per day',  'Planting', 'Large plants — 48" box standard'),
  ('48" box premium',               0.3,  'per day',  'Planting', 'Large plants — 48" box premium'),
  ('48" box fruit',                 0.3,  'per day',  'Planting', 'Large plants — 48" box fruit'),
  ('48" box palm',                  0.3,  'per day',  'Planting', 'Large plants — 48" box palm')
ON CONFLICT DO NOTHING;

-- ── Material catalog prices (material_rates, category=Planting) ──────
INSERT INTO public.material_rates (name, unit_cost, unit, category, notes) VALUES
  -- Plant catalog prices
  ('Flats of Groundcover',  18.00,  'ea', 'Planting', 'Catalog price — flats of groundcover'),
  ('Flats of 4" pots',      20.00,  'ea', 'Planting', 'Catalog price — flats of 4" pots'),
  ('4" pots succulents',    7.00,   'ea', 'Planting', 'Catalog price — 4" pots succulents'),
  ('6" pots succulents',    12.00,  'ea', 'Planting', 'Catalog price — 6" pots succulents'),
  ('1 gallon standard',     6.50,   'ea', 'Planting', 'Catalog price — 1 gal standard'),
  ('1 gallon premium',      8.00,   'ea', 'Planting', 'Catalog price — 1 gal premium'),
  ('1 gallon succulents',   18.00,  'ea', 'Planting', 'Catalog price — 1 gal succulents'),
  ('3 gallon standard',     7.00,   'ea', 'Planting', 'Catalog price — 3 gal standard'),
  ('5 gallon standard',     17.00,  'ea', 'Planting', 'Catalog price — 5 gal standard'),
  ('5 gallon premium',      35.00,  'ea', 'Planting', 'Catalog price — 5 gal premium'),
  ('5 gallon succulents',   39.00,  'ea', 'Planting', 'Catalog price — 5 gal succulents'),
  ('5 gallon bamboo',       40.00,  'ea', 'Planting', 'Catalog price — 5 gal bamboo'),
  ('5 gallon palm',         50.00,  'ea', 'Planting', 'Catalog price — 5 gal palm'),
  ('15 gallon standard',    52.00,  'ea', 'Planting', 'Catalog price — 15 gal standard'),
  ('15 gallon premium',     90.00,  'ea', 'Planting', 'Catalog price — 15 gal premium'),
  ('15 gallon succulents',  225.00, 'ea', 'Planting', 'Catalog price — 15 gal succulents'),
  ('15 gallon fruit',       145.00, 'ea', 'Planting', 'Catalog price — 15 gal fruit'),
  ('15 gallon palms',       175.00, 'ea', 'Planting', 'Catalog price — 15 gal palms'),
  ('24" box standard',      185.00, 'ea', 'Planting', 'Catalog price — 24" box standard'),
  ('24" box premium',       250.00, 'ea', 'Planting', 'Catalog price — 24" box premium'),
  ('36" box standard',      450.00, 'ea', 'Planting', 'Catalog price — 36" box standard'),
  ('36" box premium',       600.00, 'ea', 'Planting', 'Catalog price — 36" box premium'),
  ('48" box standard',      800.00, 'ea', 'Planting', 'Catalog price — 48" box standard'),
  -- Add-on materials
  ('Tree Stake',            8.50,   'ea', 'Planting', 'Tree stake unit cost'),
  ('Root Barrier 12in',     5.00,   'LF', 'Planting', '12" root barrier per LF'),
  ('Root Barrier 24in',     7.00,   'LF', 'Planting', '24" root barrier per LF'),
  ('Gopher Basket 1 Gal',   3.42,   'ea', 'Planting', '1-gallon gopher basket'),
  ('Gopher Basket 5 Gal',   7.78,   'ea', 'Planting', '5-gallon gopher basket'),
  ('Gopher Basket 15 Gal',  10.50,  'ea', 'Planting', '15-gallon gopher basket'),
  ('Mesh Flat',             1.00,   'SF', 'Planting', 'Mesh flat per SF'),
  ('Jute Fabric',           0.40,   'SF', 'Planting', 'Jute fabric per SF')
ON CONFLICT DO NOTHING;


-- ====================================================================
-- IRRIGATION MODULE
-- ====================================================================

INSERT INTO public.labor_rates (name, rate, unit, category, notes) VALUES
  ('Irrigation - Hand Zone',     16,   'hrs/zone', 'Irrigation', 'Planter spray / hillside hand-install zone'),
  ('Irrigation - Trench Zone',   12.5, 'hrs/zone', 'Irrigation', 'Lawn / drip / dripline trenched zone'),
  ('Irrigation - Timer Install', 0.5,  'hrs/ea',   'Irrigation', 'Hours to install any timer/controller')
ON CONFLICT DO NOTHING;

INSERT INTO public.material_rates (name, unit_cost, unit, category, notes) VALUES
  -- Zone materials
  ('Irrigation Zone - Planter Spray',                       345,    'zone', 'Irrigation', 'Planter spray heads materials per zone'),
  ('Irrigation Zone - Lawn',                                345,    'zone', 'Irrigation', 'Lawn zone (≤ 1,000 SF) materials'),
  ('Irrigation Zone - Hillside',                            345,    'zone', 'Irrigation', 'Hillside zone (≤ 6 big heads) materials'),
  ('Irrigation Zone - Drip per Plant',                      230,    'zone', 'Irrigation', 'Drip per plant (≤ 50 emitters) materials'),
  ('Irrigation Zone - Planter Dripline',                    345,    'zone', 'Irrigation', 'Planter dripline (≤ 700 SF) materials'),
  -- Timer materials
  ('Irrigation Timer - 4 Station',                          69.00,  'ea',   'Irrigation', '4-station timer'),
  ('Irrigation Timer - 6 Station',                          138.00, 'ea',   'Irrigation', '6-station timer'),
  ('Irrigation Timer - 9 Station',                          184.00, 'ea',   'Irrigation', '9-station timer'),
  ('Irrigation Timer - 12 Station',                         270.25, 'ea',   'Irrigation', '12-station timer'),
  ('Irrigation Timer - 15 Station',                         322.00, 'ea',   'Irrigation', '15-station timer'),
  ('Irrigation Timer - 18 Station',                         402.50, 'ea',   'Irrigation', '18-station timer'),
  ('Irrigation Timer - Hunter ICC 8 Station',               345.00, 'ea',   'Irrigation', 'Hunter ICC 8-station timer'),
  ('Irrigation Timer - Additional 8 Station Module',        115.00, 'ea',   'Irrigation', 'Additional 8-station module')
ON CONFLICT DO NOTHING;


-- ====================================================================
-- GROUND TREATMENTS MODULE
-- ====================================================================

INSERT INTO public.labor_rates (name, rate, unit, category, notes) VALUES
  ('Plastic Edging - Labor Rate', 0.09,    'hrs/LF', 'Ground Treatments', 'Plastic edging install hours per LF'),
  ('Metal Edging - Labor Rate',   0.17,    'hrs/LF', 'Ground Treatments', 'Metal edging install hours per LF'),
  ('Soil Prep - Labor Rate',      0.012,   'hrs/SF', 'Ground Treatments', 'Soil prep hours per SF'),
  ('Sod - Labor Rate',            0.01143, 'hrs/SF', 'Ground Treatments', 'Sod install hours per SF (~8 hrs / 700 SF)'),
  ('Flagstone Steppers - Labor Rate', 35,  'SF/day', 'Ground Treatments', 'Flagstone steppers SF per crew day'),
  ('Precast Steppers - Labor Rate',   50,  'SF/day', 'Ground Treatments', 'Precast steppers SF per crew day'),
  ('Gravel Fabric - Labor Rate',  0.024,   'hrs/SF', 'Ground Treatments', 'Gravel fabric install hours per SF')
ON CONFLICT DO NOTHING;

INSERT INTO public.material_rates (name, unit_cost, unit, category, notes) VALUES
  ('Mulch',                25.00,  'CY',   'Ground Treatments', 'Mulch per CY'),
  ('Mulch Delivery Fee',   75.00,  'flat', 'Ground Treatments', 'Mulch delivery flat fee'),
  ('Plastic Edging',       1.20,   'LF',   'Ground Treatments', 'Plastic edging per LF'),
  ('Metal Edging',          4.00,  'LF',   'Ground Treatments', 'Metal edging per LF'),
  ('Soil Prep',            0.1558, 'SF',   'Ground Treatments', 'Soil prep material per SF'),
  ('Sod - Marathon',       1.20,   'SF',   'Ground Treatments', 'Marathon sod material per SF'),
  ('Sod - St. Augustine',  1.97,   'SF',   'Ground Treatments', 'St. Augustine sod material per SF'),
  ('Flagstone Steppers',   500.00, 'ton',  'Ground Treatments', 'Flagstone stepper material per ton'),
  ('Precast Steppers',     200.00, 'ton',  'Ground Treatments', 'Precast stepper material per ton'),
  ('Decomposed Granite',   50.00,  'ton',  'Ground Treatments', 'DG material per ton'),
  ('DG Cement Mix',        20.00,  'ton',  'Ground Treatments', 'DG cement add-on per ton'),
  ('Gravel Fabric',        0.10,   'SF',   'Ground Treatments', 'Gravel underlay fabric per SF')
ON CONFLICT DO NOTHING;


-- ====================================================================
-- LIGHTING MODULE
-- ====================================================================

INSERT INTO public.labor_rates (name, rate, unit, category, notes) VALUES
  -- Fixture install labor (hours per unit)
  ('Lighting - Spot Light Labor',        0.5,   'hrs/ea', 'Lighting', 'Hours to install one spot light'),
  ('Lighting - Flood Light Labor',       0.5,   'hrs/ea', 'Lighting', 'Hours to install one flood light'),
  ('Lighting - Wall Washer Light Labor', 0.5,   'hrs/ea', 'Lighting', 'Hours to install one wall washer'),
  ('Lighting - Path Light Labor',        0.5,   'hrs/ea', 'Lighting', 'Hours to install one path light'),
  ('Lighting - Step Light Labor',        0.5,   'hrs/ea', 'Lighting', 'Hours to install one step light'),
  ('Lighting - Bistro Labor',            0.125, 'hrs/LF', 'Lighting', 'Hours per LF for bistro string'),
  -- Transformer install labor
  ('Lighting - Transformer 100W Labor',  0.25,  'hrs/ea', 'Lighting', 'Hours to mount + wire 100W transformer'),
  ('Lighting - Transformer 200W Labor',  0.25,  'hrs/ea', 'Lighting', 'Hours to mount + wire 200W transformer'),
  ('Lighting - Transformer 300W Labor',  0.25,  'hrs/ea', 'Lighting', 'Hours to mount + wire 300W transformer'),
  ('Lighting - Transformer 600W Labor',  0.25,  'hrs/ea', 'Lighting', 'Hours to mount + wire 600W transformer'),
  ('Lighting - Transformer 900W Labor',  0.25,  'hrs/ea', 'Lighting', 'Hours to mount + wire 900W transformer'),
  ('Lighting - Transformer 1200W Labor', 0.25,  'hrs/ea', 'Lighting', 'Hours to mount + wire 1200W transformer')
ON CONFLICT DO NOTHING;

INSERT INTO public.material_rates (name, unit_cost, unit, category, notes) VALUES
  -- Fixtures
  ('Spot Light',        99.00,  'ea', 'Lighting', 'Spot light fixture'),
  ('Flood Light',       99.00,  'ea', 'Lighting', 'Flood light fixture'),
  ('Wall Washer Light', 99.00,  'ea', 'Lighting', 'Wall washer fixture'),
  ('Path Light',        135.45, 'ea', 'Lighting', 'Path light fixture'),
  ('Step Light',        67.05,  'ea', 'Lighting', 'Step light fixture'),
  ('Bistro Lighting',   11.52,  'LF', 'Lighting', 'Bistro string per LF'),
  -- Transformers
  ('Transformer 100W',  205.50, 'ea', 'Lighting', '100-watt landscape transformer'),
  ('Transformer 200W',  222.00, 'ea', 'Lighting', '200-watt landscape transformer'),
  ('Transformer 300W',  237.00, 'ea', 'Lighting', '300-watt landscape transformer'),
  ('Transformer 600W',  367.50, 'ea', 'Lighting', '600-watt landscape transformer'),
  ('Transformer 900W',  520.50, 'ea', 'Lighting', '900-watt landscape transformer'),
  ('Transformer 1200W', 666.00, 'ea', 'Lighting', '1200-watt landscape transformer'),
  -- Wire & other
  ('12x2 E. Wiring 250'' Roll', 115.00, 'roll', 'Lighting', '12x2 low-voltage wire — 250'' roll'),
  ('12x2 E. Wiring',            0.35,   'LF',   'Lighting', '12x2 low-voltage wire — per foot'),
  ('Fx Timer',                  16.26,  'ea',   'Lighting', 'Fx timer module'),
  ('Bistro Wire',               4.00,   'LF',   'Lighting', 'Bistro wire — per foot')
ON CONFLICT DO NOTHING;


-- ====================================================================
-- UTILITIES MODULE
-- ====================================================================

INSERT INTO public.labor_rates (name, rate, unit, category, notes) VALUES
  ('Utilities Trench Excavation',                   10,   'min/cf', 'Utilities', 'Trench machine excavation rate'),
  ('Utilities Hand Excavation',                     12.5, 'min/cf', 'Utilities', 'Hand excavation rate'),
  ('PVC Conduit with Electrical - Labor Rate',      0.05, 'hrs/LF', 'Utilities', 'Labor to lay PVC conduit + wire'),
  ('1" Black Iron Gas Pipe - Labor Rate',           0.15, 'hrs/LF', 'Utilities', 'Labor to install 1" black iron gas pipe'),
  ('1-1/2" Black Iron Gas Pipe - Labor Rate',       0.20, 'hrs/LF', 'Utilities', 'Labor to install 1-1/2" black iron gas pipe'),
  ('12" Single Gas Ring - Labor Rate',              2,    'hrs/ea', 'Utilities', 'Labor to install 12" single gas ring'),
  ('Curb Core - Labor Rate',                        2,    'hrs/ea', 'Utilities', 'Labor per curb core'),
  ('Hydrocut Under Hardscape - Labor Rate',         2,    'hrs/ea', 'Utilities', 'Labor per hydrocut under hardscape')
ON CONFLICT DO NOTHING;

INSERT INTO public.material_rates (name, unit_cost, unit, category, notes) VALUES
  ('PVC Conduit with Electrical',  1.92,  'LF', 'Utilities', 'PVC conduit + wire material per LF'),
  ('1" Black Iron Gas Pipe',       2.76,  'LF', 'Utilities', '1" black iron gas pipe per LF'),
  ('1-1/2" Black Iron Gas Pipe',   4.23,  'LF', 'Utilities', '1-1/2" black iron gas pipe per LF'),
  ('12" Single Gas Ring',          61.75, 'ea', 'Utilities', '12" single gas ring fixture'),
  ('Curb Core',                    250,   'ea', 'Utilities', 'Curb core material cost'),
  ('Hydrocut Under Hardscape',     50,    'ea', 'Utilities', 'Hydrocut under hardscape material cost')
ON CONFLICT DO NOTHING;


-- ====================================================================
-- ARTIFICIAL TURF MODULE
-- ====================================================================

-- ── Labor rates (labor_rates, category=Artificial Turf) ───────────────
INSERT INTO public.labor_rates (name, rate, unit, category, notes) VALUES
  ('Turf - Demo Skid Steer Good', 2.00, 't/hr', 'Artificial Turf', 'Turf demo — skid steer good access'),
  ('Turf - Demo Skid Steer OK',   1.50, 't/hr', 'Artificial Turf', 'Turf demo — skid steer limited access'),
  ('Turf - Demo Mini Skid Steer', 0.75, 't/hr', 'Artificial Turf', 'Turf demo — mini skid steer'),
  ('Turf - Demo Wheelbarrow',     0.50, 't/hr', 'Artificial Turf', 'Turf demo — wheelbarrow'),
  ('Turf - Demo Hand',            0.38, 't/hr', 'Artificial Turf', 'Turf demo — hand')
ON CONFLICT DO NOTHING;

-- ── Material catalog (material_rates, category=Artificial Turf) ──────
INSERT INTO public.material_rates (name, unit_cost, unit, category, notes) VALUES
  -- Base materials
  ('Turf - Gravel Base',          6.90,   'ton', 'Artificial Turf', 'Gravel base per ton'),
  ('Turf - DG Base',              57.50,  'ton', 'Artificial Turf', 'Decomposed granite base per ton'),
  ('Turf - Weed Barrier Fabric',  165.00, 'roll', 'Artificial Turf', 'Weed barrier fabric per 1,800 SF roll'),
  -- Install materials
  ('Turf - Install Materials',    0.140,  'LF',  'Artificial Turf', 'Cut/staple/seam materials per LF of edge'),
  -- Infill
  ('Turf - Infill Durafill',      0.62,   'SF',  'Artificial Turf', 'Standard Durafill per SF'),
  ('Turf - Infill ZeoFill',       30.00,  'bag', 'Artificial Turf', 'ZeoFill pet odor infill per 30 SF bag'),
  -- Turf brands
  ('Turf - Socal Blen Supreme 80', 2.39,  'SF',  'Artificial Turf', 'Socal Blen Supreme — 80 oz'),
  ('Turf - Bel Air SH 92/66',      1.79,  'SF',  'Artificial Turf', 'Bel Air SH 92/66'),
  ('Turf - Venice SH Light 50',    1.49,  'SF',  'Artificial Turf', 'Venice SH Light — 50'),
  ('Turf - Bel Air SH Light 50',   1.29,  'SF',  'Artificial Turf', 'Bel Air SH Light — 50'),
  ('Turf - Performance Play 63',   1.79,  'SF',  'Artificial Turf', 'Performance Play — 63'),
  ('Turf - Autumn Grass 75',       2.98,  'SF',  'Artificial Turf', 'Autumn Grass — 75'),
  ('Turf - Bel Air Supreme 90',    1.98,  'SF',  'Artificial Turf', 'Bel Air Supreme — 90'),
  ('Turf - Pet Turf Pro 85',       2.29,  'SF',  'Artificial Turf', 'Pet Turf Pro — 85'),
  ('Turf - Verdant Supreme 94',    2.39,  'SF',  'Artificial Turf', 'Verdant Supreme — 94'),
  ('Turf - Golf Pro SH 47',        1.98,  'SF',  'Artificial Turf', 'Golf Pro SH — 47')
ON CONFLICT DO NOTHING;


-- ====================================================================
-- OUTDOOR KITCHEN MODULE
-- ====================================================================

INSERT INTO public.labor_rates (name, rate, unit, category, notes) VALUES
  ('BBQ Excavate Labor Rate',           5,      'CF/hr',  'Outdoor Kitchen', 'BBQ footing excavation rate'),
  ('BBQ Rebar Labor Rate',              146,    'LF/day', 'Outdoor Kitchen', 'BBQ rebar setting rate'),
  ('BBQ Pour Footing Labor Rate',       4,      'hrs/CY', 'Outdoor Kitchen', 'BBQ pour footing labor'),
  ('BBQ Block Install Labor Rate',      60,     'blk/day','Outdoor Kitchen', 'BBQ block setting rate'),
  ('BBQ Fill Block Labor Rate',         146,    'blk/day','Outdoor Kitchen', 'BBQ block grouting/filling rate'),
  ('BBQ Counter Form Labor Rate',       20,     'LF/hr',  'Outdoor Kitchen', 'BBQ countertop form setting'),
  ('BBQ Counter Pour Labor Rate',       50,     'SF/day', 'Outdoor Kitchen', 'BBQ countertop pour'),
  ('BBQ Counter Broom Labor Rate',      60,     'SF/day', 'Outdoor Kitchen', 'BBQ countertop broom finish'),
  ('BBQ Counter Polish Labor Rate',     18,     'SF/day', 'Outdoor Kitchen', 'BBQ countertop polish finish'),
  ('BBQ Appliance Labor Rate',          2.75,   'per day','Outdoor Kitchen', 'BBQ appliances installed per crew day'),
  ('BBQ GFIC Labor Rate',               2,      'hrs/ea', 'Outdoor Kitchen', 'GFIC outlet install hours'),
  ('BBQ Sink Labor Rate',               4,      'hrs',    'Outdoor Kitchen', 'BBQ sink plumbing flat labor'),
  ('BBQ Gas Trench Labor Rate',         35,     'LF/day', 'Outdoor Kitchen', 'Gas line trench/run rate'),
  ('Sand Stucco - BBQ Labor Rate',      92,     'SF/day', 'Outdoor Kitchen', 'Sand stucco SF per crew day'),
  ('Smooth Stucco - BBQ Labor Rate',    65,     'SF/day', 'Outdoor Kitchen', 'Smooth stucco SF per crew day'),
  ('Ledgerstone - BBQ Labor Rate',      24,     'SF/day', 'Outdoor Kitchen', 'Ledgerstone veneer SF per crew day'),
  ('Stacked Stone - BBQ Labor Rate',    24,     'SF/day', 'Outdoor Kitchen', 'Stacked stone veneer SF per crew day'),
  ('Tile - BBQ Labor Rate',             0.2867, 'hrs/SF', 'Outdoor Kitchen', 'Tile install hours per SF'),
  ('Real Flagstone - BBQ Labor Rate',   0.4487, 'hrs/SF', 'Outdoor Kitchen', 'Real flagstone install hours per SF'),
  ('Real Stone - BBQ Labor Rate',       0.8954, 'hrs/SF', 'Outdoor Kitchen', 'Real stone install hours per SF')
ON CONFLICT DO NOTHING;

INSERT INTO public.material_rates (name, unit_cost, unit, category, notes) VALUES
  ('BBQ Block',              2.50,   'ea',   'Outdoor Kitchen', 'CMU block for BBQ wall'),
  ('BBQ Rebar',              0.40,   'LF',   'Outdoor Kitchen', 'Rebar per LF for BBQ structure'),
  ('BBQ Concrete',           149.50, 'CY',   'Outdoor Kitchen', 'Concrete per CY (footing & countertop)'),
  ('BBQ Fill Material',      60.00,  'CY',   'Outdoor Kitchen', 'Grout/fill per CY'),
  ('BBQ Appliance Hardware', 3.00,   'ea',   'Outdoor Kitchen', 'Misc hardware per appliance'),
  ('GFIC Outlet - BBQ',      80.00,  'ea',   'Outdoor Kitchen', 'GFIC outlet material'),
  ('Sink Plumbing - BBQ',    115.00, 'flat', 'Outdoor Kitchen', 'Sink plumbing flat material'),
  ('Gas Pipe - BBQ',         3.00,   'LF',   'Outdoor Kitchen', 'Gas pipe per LF'),
  ('Sand Stucco - BBQ',      0.00,   'SF',   'Outdoor Kitchen', 'Sand stucco material per SF (set to actual)'),
  ('Smooth Stucco - BBQ',    0.00,   'SF',   'Outdoor Kitchen', 'Smooth stucco material per SF (set to actual)'),
  ('Ledgerstone - BBQ',      10.00,  'SF',   'Outdoor Kitchen', 'Ledgerstone veneer per SF'),
  ('Stacked Stone - BBQ',    10.00,  'SF',   'Outdoor Kitchen', 'Stacked stone veneer per SF'),
  ('Tile - BBQ',             6.50,   'SF',   'Outdoor Kitchen', 'Tile per SF'),
  ('Real Flagstone - BBQ',   400.00, 'ton',  'Outdoor Kitchen', 'Real flagstone per ton'),
  ('Real Stone - BBQ',       400.00, 'ton',  'Outdoor Kitchen', 'Real stone per ton')
ON CONFLICT DO NOTHING;


-- ====================================================================
-- FIRE PIT MODULE
-- ====================================================================

INSERT INTO public.labor_rates (name, rate, unit, category, notes) VALUES
  ('FP Dig Footing Labor Rate',         4.0,    'CF/hr',  'Fire Pit', 'Fire pit footing dig rate'),
  ('FP Set Rebar Labor Rate',           35.0,   'LF/hr',  'Fire Pit', 'Fire pit rebar setting rate'),
  ('FP Set Blocks Labor Rate',          10.4,   'blk/hr', 'Fire Pit', 'Fire pit block setting rate'),
  ('FP Hand Grout Labor Rate',          5.5,    'CF/hr',  'Fire Pit', 'Fire pit hand grouting rate'),
  ('FP Pump Grout Labor Rate',          81.0,   'CF/hr',  'Fire Pit', 'Fire pit pump grouting rate'),
  ('FP Gas Trench Labor Rate',          35.0,   'LF/day', 'Fire Pit', 'Fire pit gas line trench rate'),
  ('Sand Stucco - FP Labor Rate',       92,     'SF/day', 'Fire Pit', 'Sand stucco SF per crew day'),
  ('Smooth Stucco - FP Labor Rate',     65,     'SF/day', 'Fire Pit', 'Smooth stucco SF per crew day'),
  ('Ledgerstone - FP Labor Rate',       24,     'SF/day', 'Fire Pit', 'Ledgerstone veneer SF per crew day'),
  ('Stacked Stone - FP Labor Rate',     24,     'SF/day', 'Fire Pit', 'Stacked stone veneer SF per crew day'),
  ('Tile - FP Labor Rate',              0.2867, 'hrs/SF', 'Fire Pit', 'Tile install hours per SF'),
  ('Real Flagstone - FP Labor Rate',    0.4487, 'hrs/SF', 'Fire Pit', 'Real flagstone install hours per SF'),
  ('Real Stone - FP Labor Rate',        0.8954, 'hrs/SF', 'Fire Pit', 'Real stone install hours per SF')
ON CONFLICT DO NOTHING;

INSERT INTO public.material_rates (name, unit_cost, unit, category, notes) VALUES
  ('FP Block',            2.50,   'ea',   'Fire Pit', 'CMU block for fire pit wall'),
  ('FP Rebar',            0.50,   'LF',   'Fire Pit', 'Rebar per LF for fire pit'),
  ('FP Concrete',         149.50, 'CY',   'Fire Pit', 'Concrete per CY (footing & grout)'),
  ('FP Grout Pump Setup', 150.00, 'flat', 'Fire Pit', 'Grout pump flat setup fee'),
  ('FP Gas Ring/Burner',  25.00,  'ea',   'Fire Pit', 'Gas ring/burner hardware per unit'),
  ('FP Gas Pipe',         3.00,   'LF',   'Fire Pit', 'Gas pipe per LF'),
  ('Sand Stucco - FP',    0.00,   'SF',   'Fire Pit', 'Sand stucco material per SF (set to actual)'),
  ('Smooth Stucco - FP',  0.00,   'SF',   'Fire Pit', 'Smooth stucco material per SF (set to actual)'),
  ('Ledgerstone - FP',    10.00,  'SF',   'Fire Pit', 'Ledgerstone veneer per SF'),
  ('Stacked Stone - FP',  10.00,  'SF',   'Fire Pit', 'Stacked stone veneer per SF'),
  ('Tile - FP',           6.50,   'SF',   'Fire Pit', 'Tile per SF'),
  ('Real Flagstone - FP', 400.00, 'ton',  'Fire Pit', 'Real flagstone per ton'),
  ('Real Stone - FP',     400.00, 'ton',  'Fire Pit', 'Real stone per ton')
ON CONFLICT DO NOTHING;


-- ====================================================================
-- COLUMNS MODULE
-- ====================================================================

INSERT INTO public.labor_rates (name, rate, unit, category, notes) VALUES
  ('CMU Install Labor',                       0.083,  'hrs/blk', 'Columns', 'CMU block install — hours per block'),
  ('Excavate Footing Labor',                  0.5,    'hrs/col', 'Columns', 'Footing excavation hours per column'),
  ('Pour Footing Labor',                      0.25,   'hrs/col', 'Columns', 'Footing pour hours per column'),
  ('Fill Labor',                              0.05,   'hrs/blk', 'Columns', 'Grout/fill hours per block'),
  ('Sand Stucco - Labor Rate',                0.05,   'hrs/SF',  'Columns', 'Sand stucco hours per SF'),
  ('Smooth Stucco - Labor Rate',              0.05,   'hrs/SF',  'Columns', 'Smooth stucco hours per SF'),
  ('Ledgerstone Veneer Panels - Labor Rate',  0.10,   'hrs/SF',  'Columns', 'Ledgerstone veneer hours per SF'),
  ('Stacked Stone Veneer - Labor Rate',       0.10,   'hrs/SF',  'Columns', 'Stacked stone veneer hours per SF'),
  ('Tile - Columns - Labor Rate',             0.125,  'hrs/SF',  'Columns', 'Tile install hours per SF'),
  ('Real Flagstone Flat - Labor Rate',        0.5,    'hrs/ton', 'Columns', 'Real flagstone install hours per ton'),
  ('Real Stone - Columns - Labor Rate',       0.5,    'hrs/ton', 'Columns', 'Real stone install hours per ton')
ON CONFLICT DO NOTHING;

INSERT INTO public.material_rates (name, unit_cost, unit, category, notes) VALUES
  ('CMU Block',                   2.50,   'ea',  'Columns', 'CMU column block'),
  ('Rebar - Columns',             0.80,   'LF',  'Columns', 'Rebar per LF (columns)'),
  ('Face Block',                  3.00,   'ea',  'Columns', 'Decorative face block'),
  ('Fill Block / Grout',          0.75,   'blk', 'Columns', 'Fill grout cost per block'),
  ('Sand Stucco',                 0.00,   'SF',  'Columns', 'Sand stucco material per SF (set to actual)'),
  ('Smooth Stucco',               0.00,   'SF',  'Columns', 'Smooth stucco material per SF (set to actual)'),
  ('Ledgerstone Veneer Panels',   10.00,  'SF',  'Columns', 'Ledgerstone veneer per SF'),
  ('Stacked Stone Veneer',        10.00,  'SF',  'Columns', 'Stacked stone veneer per SF'),
  ('Tile - Columns',              6.50,   'SF',  'Columns', 'Tile per SF (columns)'),
  ('Real Flagstone Flat',         400.00, 'ton', 'Columns', 'Real flagstone per ton'),
  ('Real Stone - Columns',        400.00, 'ton', 'Columns', 'Real stone per ton (columns)'),
  ('BBQ Block',                   5.00,   'ea',  'Columns', 'BBQ block (columns add-on)'),
  ('Backsplash Block',            3.50,   'ea',  'Columns', 'Backsplash block (columns add-on)')
ON CONFLICT DO NOTHING;


-- ====================================================================
-- FINISHES MODULE
-- ====================================================================

INSERT INTO public.labor_rates (name, rate, unit, category, notes) VALUES
  ('Finishes Tile Flatwork Labor Rate',       0.2867, 'hrs/SF', 'Finishes', 'Tile flatwork hours per SF'),
  ('Finishes Brick Flatwork Labor Rate',      0.35,   'hrs/SF', 'Finishes', 'Brick flatwork hours per SF'),
  ('Finishes Flagstone Flatwork Labor Rate',  0.4487, 'hrs/SF', 'Finishes', 'Flagstone flatwork hours per SF'),
  ('Finishes Porcelain Flatwork Labor Rate',  0.267,  'hrs/SF', 'Finishes', 'Porcelain paver flatwork hours per SF'),
  ('Sand Stucco - Finishes Labor Rate',       92,     'SF/day', 'Finishes', 'Sand stucco SF per crew day'),
  ('Smooth Stucco - Finishes Labor Rate',     65,     'SF/day', 'Finishes', 'Smooth stucco SF per crew day'),
  ('Ledgerstone - Finishes Labor Rate',       24,     'SF/day', 'Finishes', 'Ledgerstone veneer SF per crew day'),
  ('Stacked Stone - Finishes Labor Rate',     24,     'SF/day', 'Finishes', 'Stacked stone veneer SF per crew day'),
  ('Tile - Finishes Labor Rate',              0.2867, 'hrs/SF', 'Finishes', 'Tile wall finish hours per SF'),
  ('Real Flagstone - Finishes Labor Rate',    0.4487, 'hrs/SF', 'Finishes', 'Real flagstone wall hours per SF'),
  ('Real Stone - Finishes Labor Rate',        0.8954, 'hrs/SF', 'Finishes', 'Real stone wall hours per SF')
ON CONFLICT DO NOTHING;

INSERT INTO public.material_rates (name, unit_cost, unit, category, notes) VALUES
  ('Finishes Tile Flatwork',          6.50,   'SF',   'Finishes', 'Tile flatwork material per SF'),
  ('Finishes Brick Flatwork',         3.00,   'brick','Finishes', 'Brick flatwork material per brick'),
  ('Finishes Flagstone Flatwork',     400.00, 'ton',  'Finishes', 'Flagstone flatwork per ton'),
  ('Finishes Porcelain Flatwork',     10.00,  'SF',   'Finishes', 'Porcelain paver flatwork per SF'),
  ('Finishes Cap Flagstone',          500.00, 'ton',  'Finishes', 'Flagstone wall cap per ton'),
  ('Finishes Cap Precast',            50.00,  'ea',   'Finishes', 'Precast wall cap per piece'),
  ('Finishes Cap Bullnose Brick',     5.00,   'LF',   'Finishes', 'Bullnose brick cap per LF'),
  ('Finishes Concrete Truck',         185.00, 'CY',   'Finishes', 'PIP concrete cap per CY'),
  ('Sand Stucco - Finishes',          0.00,   'SF',   'Finishes', 'Sand stucco material per SF (set to actual)'),
  ('Smooth Stucco - Finishes',        0.00,   'SF',   'Finishes', 'Smooth stucco material per SF (set to actual)'),
  ('Ledgerstone - Finishes',          10.00,  'SF',   'Finishes', 'Ledgerstone veneer per SF'),
  ('Stacked Stone - Finishes',        10.00,  'SF',   'Finishes', 'Stacked stone veneer per SF'),
  ('Tile - Finishes',                 6.50,   'SF',   'Finishes', 'Tile per SF (wall finish)'),
  ('Real Flagstone - Finishes',       400.00, 'ton',  'Finishes', 'Real flagstone wall per ton'),
  ('Real Stone - Finishes',           400.00, 'ton',  'Finishes', 'Real stone wall per ton')
ON CONFLICT DO NOTHING;


-- ====================================================================
-- POOL MODULE
-- ====================================================================

-- ── Labor rates (labor_rates, category=Pool) ──────────────────────────
INSERT INTO public.labor_rates (name, rate, unit, category, notes) VALUES
  -- Waterline tile install rates (hours per LF)
  ('Tile - 6" Squares',             0.356, 'hrs/LF', 'Pool', 'Waterline tile install — 6" squares'),
  ('Tile - 3" Squares',             0.400, 'hrs/LF', 'Pool', 'Waterline tile install — 3" squares'),
  ('Tile - 2" Squares',             0.421, 'hrs/LF', 'Pool', 'Waterline tile install — 2" squares'),
  ('Tile - 1" Squares',             0.457, 'hrs/LF', 'Pool', 'Waterline tile install — 1" squares'),
  ('Tile - Segmental',              0.533, 'hrs/LF', 'Pool', 'Waterline tile install — segmental'),
  ('Tile - Multi-Piece',            0.457, 'hrs/LF', 'Pool', 'Waterline tile install — multi-piece'),
  ('Tile - Glass Tile',             0.533, 'hrs/LF', 'Pool', 'Waterline tile install — glass tile'),
  -- Coping labor (hours per LF)
  ('Coping - Paver Bullnose',       0.400, 'hrs/LF', 'Pool', 'Coping install — paver bullnose'),
  ('Coping - Travertine 12"x12"',   0.444, 'hrs/LF', 'Pool', 'Coping install — travertine 12x12'),
  ('Coping - Precast Concrete',     0.444, 'hrs/LF', 'Pool', 'Coping install — precast concrete'),
  ('Coping - Arizona Flagstone Eased', 0.500, 'hrs/LF', 'Pool', 'Coping install — Arizona flagstone'),
  ('Coping - Other Flagstone',      0.533, 'hrs/LF', 'Pool', 'Coping install — other flagstone'),
  ('Coping - Pacific Clay',         0.410, 'hrs/LF', 'Pool', 'Coping install — Pacific Clay'),
  ('Coping - Pour In Place Sand Finish', 0.727, 'hrs/LF', 'Pool', 'Coping install — PIP sand finish'),
  -- Spillway labor (hours per LF)
  ('Spillway - TILE',               1.25,  'hrs/LF', 'Pool', 'Tile spillway install'),
  ('Spillway - FLAGSTONE',          0.50,  'hrs/LF', 'Pool', 'Flagstone spillway install'),
  -- Raised surface labor (hours per SF)
  ('Raised - 6" Square Tile',       0.356, 'hrs/SF', 'Pool', 'Raised surface — 6" square tile'),
  ('Raised - 3" Square Tile',       0.400, 'hrs/SF', 'Pool', 'Raised surface — 3" square tile'),
  ('Raised - 2" Square Tile',       0.421, 'hrs/SF', 'Pool', 'Raised surface — 2" square tile'),
  ('Raised - 1" Square Tile',       0.457, 'hrs/SF', 'Pool', 'Raised surface — 1" square tile'),
  ('Raised - Segmental Tile',       0.533, 'hrs/SF', 'Pool', 'Raised surface — segmental tile'),
  ('Raised - Multi-Piece Tile',     0.457, 'hrs/SF', 'Pool', 'Raised surface — multi-piece tile'),
  ('Raised - Glass Tile',           0.533, 'hrs/SF', 'Pool', 'Raised surface — glass tile'),
  ('Raised - MSI Ledgerstone',      0.200, 'hrs/SF', 'Pool', 'Raised surface — MSI ledgerstone'),
  ('Raised - Flat Flagstone Arizona', 0.220, 'hrs/SF', 'Pool', 'Raised surface — flat flagstone Arizona'),
  ('Raised - Flat Flagstone Other', 0.220, 'hrs/SF', 'Pool', 'Raised surface — flat flagstone other'),
  ('Raised - Stucco',               0.100, 'hrs/SF', 'Pool', 'Raised surface — stucco'),
  ('Raised - Integral Color Stucco', 0.110, 'hrs/SF', 'Pool', 'Raised surface — integral color stucco')
ON CONFLICT DO NOTHING;

-- ── Material costs (material_rates, category=Pool) ────────────────────
INSERT INTO public.material_rates (name, unit_cost, unit, category, notes) VALUES
  -- Spillway materials
  ('Spillway TILE',                 30.00, 'LF', 'Pool', 'Tile spillway material per LF'),
  ('Spillway FLAGSTONE',            24.00, 'LF', 'Pool', 'Flagstone spillway material per LF'),
  -- Coping materials
  ('Coping - Paver Bullnose',       8.50,  'LF', 'Pool', 'Paver bullnose coping per LF'),
  ('Coping - Travertine 12"x12"',   13.00, 'LF', 'Pool', 'Travertine 12x12 coping per LF'),
  ('Coping - Precast Concrete',     50.00, 'LF', 'Pool', 'Precast concrete coping per LF'),
  ('Coping - Arizona Flagstone Eased', 13.00, 'LF', 'Pool', 'Arizona flagstone eased coping per LF'),
  ('Coping - Other Flagstone',      18.00, 'LF', 'Pool', 'Other flagstone coping per LF'),
  ('Coping - Pacific Clay',         12.00, 'LF', 'Pool', 'Pacific Clay coping per LF'),
  ('Coping - Pour In Place Sand Finish', 7.50, 'LF', 'Pool', 'PIP sand finish coping per LF'),
  -- Raised surface materials
  ('Raised - 6" Square Tile',       6.50,  'SF', 'Pool', 'Raised surface — 6" square tile'),
  ('Raised - 3" Square Tile',       6.50,  'SF', 'Pool', 'Raised surface — 3" square tile'),
  ('Raised - 2" Square Tile',       6.50,  'SF', 'Pool', 'Raised surface — 2" square tile'),
  ('Raised - 1" Square Tile',       6.50,  'SF', 'Pool', 'Raised surface — 1" square tile'),
  ('Raised - Segmental Tile',       6.50,  'SF', 'Pool', 'Raised surface — segmental tile'),
  ('Raised - Multi-Piece Tile',     6.50,  'SF', 'Pool', 'Raised surface — multi-piece tile'),
  ('Raised - Glass Tile',           12.00, 'SF', 'Pool', 'Raised surface — glass tile'),
  ('Raised - MSI Ledgerstone',      5.50,  'SF', 'Pool', 'Raised surface — MSI ledgerstone'),
  ('Raised - Flat Flagstone Arizona', 4.50, 'SF', 'Pool', 'Raised surface — flat flagstone Arizona'),
  ('Raised - Flat Flagstone Other', 6.00,  'SF', 'Pool', 'Raised surface — flat flagstone other'),
  ('Raised - Stucco',               0.50,  'SF', 'Pool', 'Raised surface — stucco'),
  ('Raised - Integral Color Stucco', 0.75, 'SF', 'Pool', 'Raised surface — integral color stucco')
ON CONFLICT DO NOTHING;

-- ── Subcontractor rates (subcontractor_rates, category=Pool) ──────────
-- NOTE: uses 'trade' column (PoolModule pulls by trade); other tables use 'company_name'
INSERT INTO public.subcontractor_rates (trade, rate, category, notes) VALUES
  -- Shotcrete
  ('Shotcrete Material',          200,  'Pool', 'Shotcrete material per CY'),
  ('Shotcrete Labor',             85,   'Pool', 'Shotcrete labor per CY'),
  ('Shotcrete Minimum Labor',     3500, 'Pool', 'Shotcrete minimum labor floor'),
  -- Interior finish ($/SF)
  ('Interior Finish - White Plaster', 45, 'Pool', 'White plaster per SF'),
  ('Interior Finish - Quartzscapes',  87, 'Pool', 'Quartzscapes per SF'),
  ('Interior Finish - Stonescapes',   83, 'Pool', 'Stonescapes per SF'),
  -- Plumbing
  ('Plumbing Pool Only',          4500, 'Pool', 'Plumbing base — pool only'),
  ('Plumbing Pool + Spa',         6000, 'Pool', 'Plumbing base — pool + spa'),
  ('Plumbing Over 20ft Add',      300,  'Pool', '>20ft from equipment add'),
  ('Plumbing Remodel Add',        200,  'Pool', 'Remodel add'),
  ('Plumbing Extra Light',        150,  'Pool', 'Extra light add (each)'),
  ('Plumbing Sheer Descent',      450,  'Pool', 'Sheer descent plumbing add (each)'),
  -- Steel
  ('Steel Per LF',                8,    'Pool', 'Steel per LF of pool perimeter'),
  ('Steel Spa Bonus',             200,  'Pool', 'Spa steel flat add-on')
ON CONFLICT DO NOTHING;
