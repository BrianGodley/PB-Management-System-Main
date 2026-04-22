-- ─────────────────────────────────────────────────────────────────────────────
-- Pool Module — Seed Data
-- Run this once in the Supabase SQL Editor to populate Master Rates
-- with all Pool material prices and labor rates.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Material Prices (material_rates, category = 'Pool') ──────────────────────
INSERT INTO material_rates (name, unit, unit_cost, category) VALUES
-- Shotcrete rates (used in auto-calc)
  ('Shotcrete Material',   'CY',   200.00, 'Pool'),
  ('Shotcrete Labor',      'CY',    85.00, 'Pool'),
  ('Shotcrete Minimum',    'each', 3500.00,'Pool'),
-- Waterline Tile material (price per SF — used as reference rates)
  ('Tile - 2.50/SF',  'SF',  2.50, 'Pool'),
  ('Tile - 3.00/SF',  'SF',  3.00, 'Pool'),
  ('Tile - 4.00/SF',  'SF',  4.00, 'Pool'),
  ('Tile - 5.00/SF',  'SF',  5.00, 'Pool'),
  ('Tile - 6.00/SF',  'SF',  6.00, 'Pool'),
  ('Tile - 8.00/SF',  'SF',  8.00, 'Pool'),
  ('Tile - 10.00/SF', 'SF', 10.00, 'Pool'),
  ('Tile - 12.00/SF', 'SF', 12.00, 'Pool'),
  ('Tile - 15.00/SF', 'SF', 15.00, 'Pool'),
  ('Tile - 20.00/SF', 'SF', 20.00, 'Pool'),
-- Coping material ($/LF)
  ('Coping - Paver Bullnose',             'LF',  8.50, 'Pool'),
  ('Coping - Travertine 12"x12"',         'LF', 13.00, 'Pool'),
  ('Coping - Precast Concrete',           'LF', 50.00, 'Pool'),
  ('Coping - Arizona Flagstone Eased',    'LF', 13.00, 'Pool'),
  ('Coping - Other Flagstone',            'LF', 18.00, 'Pool'),
  ('Coping - Pacific Clay',               'LF', 12.00, 'Pool'),
  ('Coping - Pour In Place Sand Finish',  'LF',  7.50, 'Pool'),
-- Spillway material ($/LF)
  ('Spillway TILE',      'LF', 30.00, 'Pool'),
  ('Spillway FLAGSTONE', 'LF', 24.00, 'Pool'),
-- Interior Finish ($/SF — sub cost basis)
  ('Interior - White Plaster', 'SF', 45.00, 'Pool'),
  ('Interior - Quartzscapes',  'SF', 87.00, 'Pool'),
  ('Interior - Stonescapes',   'SF', 83.00, 'Pool'),
-- Raised Surface materials ($/SF)
  ('Raised - 6" Square Tile',          'SF',  6.50, 'Pool'),
  ('Raised - 3" Square Tile',          'SF',  6.50, 'Pool'),
  ('Raised - 2" Square Tile',          'SF',  6.50, 'Pool'),
  ('Raised - 1" Square Tile',          'SF',  6.50, 'Pool'),
  ('Raised - Segmental Tile',          'SF',  6.50, 'Pool'),
  ('Raised - Multi-Piece Tile',        'SF',  6.50, 'Pool'),
  ('Raised - Glass Tile',              'SF', 12.00, 'Pool'),
  ('Raised - MSI Ledgerstone',         'SF',  5.50, 'Pool'),
  ('Raised - Flat Flagstone Arizona',  'SF',  4.50, 'Pool'),
  ('Raised - Flat Flagstone Other',    'SF',  6.00, 'Pool'),
  ('Raised - Stucco',                  'SF',  0.50, 'Pool'),
  ('Raised - Integral Color Stucco',   'SF',  0.75, 'Pool'),
-- Pool Equipment — Pumps
  ('VSHP270AUT', 'each', 1498.00, 'Pool'),
  ('VSHP33AUT',  'each', 1650.00, 'Pool'),
-- Pool Equipment — Filters
  ('CV340', 'each', 1139.00, 'Pool'),
  ('CV460', 'each', 1259.00, 'Pool'),
  ('CV580', 'each', 1462.00, 'Pool'),
-- Pool Equipment — Heaters
  ('VersaTemp', 'each', 4180.00, 'Pool'),
  ('JXi400N',   'each', 2980.00, 'Pool'),
-- Pool Equipment — Salt Sanitizer
  ('APUREM', 'each', 2047.00, 'Pool'),
-- Pool Equipment — Sheer Descents (1" lip)
  ('1'' - 1" Lip',  'each', 289.00, 'Pool'),
  ('2'' - 1" Lip',  'each', 349.00, 'Pool'),
  ('3'' - 1" Lip',  'each', 429.00, 'Pool'),
  ('4'' - 1" Lip',  'each', 559.00, 'Pool'),
  ('5'' - 1" Lip',  'each', 699.00, 'Pool'),
  ('6'' - 1" Lip',  'each', 899.00, 'Pool'),
-- Pool Equipment — Sheer Descents (6" lip)
  ('1'' - 6" Lip',  'each', 329.00, 'Pool'),
  ('2'' - 6" Lip',  'each', 399.00, 'Pool'),
  ('3'' - 6" Lip',  'each', 479.00, 'Pool'),
  ('4'' - 6" Lip',  'each', 609.00, 'Pool'),
  ('5'' - 6" Lip',  'each', 749.00, 'Pool'),
  ('6'' - 6" Lip',  'each', 949.00, 'Pool'),
-- Pool Equipment — Sheer Descents (12" lip)
  ('1'' - 12" Lip', 'each', 369.00, 'Pool'),
  ('2'' - 12" Lip', 'each', 449.00, 'Pool'),
  ('3'' - 12" Lip', 'each', 529.00, 'Pool'),
  ('4'' - 12" Lip', 'each', 659.00, 'Pool'),
  ('5'' - 12" Lip', 'each', 799.00, 'Pool'),
  ('6'' - 12" Lip', 'each', 999.00, 'Pool'),
-- Pool Equipment — Lighting
  ('RGBW 50''',  'each', 634.00, 'Pool'),
  ('RGBW 100''', 'each', 743.00, 'Pool'),
-- Pool Equipment — Automation
  ('RS-P4',  'each', 2113.00, 'Pool'),
  ('RS-PS4', 'each', 2024.00, 'Pool'),
  ('RS-P6',  'each', 3048.00, 'Pool'),
  ('RS-PS6', 'each', 3048.00, 'Pool'),
  ('RS-PS8', 'each', 3853.00, 'Pool'),
-- Plumbing base rates
  ('Plumbing - Pool Only',  'each', 4500.00, 'Pool'),
  ('Plumbing - Pool + Spa', 'each', 6000.00, 'Pool');

-- ── Labor Rates (labor_rates, category = 'Pool') ──────────────────────────────
INSERT INTO labor_rates (name, rate, unit, category, rate_per_day, notes) VALUES
-- Waterline Tile install rates (hrs/LF)
  ('Tile - 6" Squares',  0.356, 'hrs/LF', 'Pool', 22.47, '6" square tile install rate — hrs per LF of waterline'),
  ('Tile - 3" Squares',  0.400, 'hrs/LF', 'Pool', 20.00, '3" square tile install rate — hrs per LF'),
  ('Tile - 2" Squares',  0.421, 'hrs/LF', 'Pool', 19.00, '2" square tile install rate — hrs per LF'),
  ('Tile - 1" Squares',  0.457, 'hrs/LF', 'Pool', 17.50, '1" square tile install rate — hrs per LF'),
  ('Tile - Segmental',   0.533, 'hrs/LF', 'Pool', 15.01, 'Segmental tile install rate — hrs per LF'),
  ('Tile - Multi-Piece', 0.457, 'hrs/LF', 'Pool', 17.50, 'Multi-piece tile install rate — hrs per LF'),
  ('Tile - Glass Tile',  0.533, 'hrs/LF', 'Pool', 15.01, 'Glass tile install rate — hrs per LF'),
-- Coping install rates (hrs/LF)
  ('Coping - Paver Bullnose',             0.400, 'hrs/LF', 'Pool', 20.00, 'Paver bullnose coping — hrs per LF'),
  ('Coping - Travertine 12"x12"',         0.444, 'hrs/LF', 'Pool', 18.02, 'Travertine 12"x12" coping — hrs per LF'),
  ('Coping - Precast Concrete',           0.444, 'hrs/LF', 'Pool', 18.02, 'Precast concrete coping — hrs per LF'),
  ('Coping - Arizona Flagstone Eased',    0.500, 'hrs/LF', 'Pool', 16.00, 'Arizona flagstone eased coping — hrs per LF'),
  ('Coping - Other Flagstone',            0.533, 'hrs/LF', 'Pool', 15.01, 'Other flagstone coping — hrs per LF'),
  ('Coping - Pacific Clay',               0.410, 'hrs/LF', 'Pool', 19.51, 'Pacific Clay coping — hrs per LF'),
  ('Coping - Pour In Place Sand Finish',  0.727, 'hrs/LF', 'Pool', 11.00, 'Pour in place sand finish coping — hrs per LF'),
-- Spillway install rates (hrs/LF)
  ('Spillway - TILE',      1.250, 'hrs/LF', 'Pool', 6.40, 'Tile spillway install rate — hrs per LF'),
  ('Spillway - FLAGSTONE', 0.500, 'hrs/LF', 'Pool', 16.00,'Flagstone spillway install rate — hrs per LF'),
-- Raised Surface install rates (hrs/SF)
  ('Raised - 6" Square Tile',         0.356, 'hrs/SF', 'Pool', 22.47, '6" square tile raised surface — hrs per SF'),
  ('Raised - 3" Square Tile',         0.400, 'hrs/SF', 'Pool', 20.00, '3" square tile raised surface — hrs per SF'),
  ('Raised - 2" Square Tile',         0.421, 'hrs/SF', 'Pool', 19.00, '2" square tile raised surface — hrs per SF'),
  ('Raised - 1" Square Tile',         0.457, 'hrs/SF', 'Pool', 17.50, '1" square tile raised surface — hrs per SF'),
  ('Raised - Segmental Tile',         0.533, 'hrs/SF', 'Pool', 15.01, 'Segmental tile raised surface — hrs per SF'),
  ('Raised - Multi-Piece Tile',       0.457, 'hrs/SF', 'Pool', 17.50, 'Multi-piece tile raised surface — hrs per SF'),
  ('Raised - Glass Tile',             0.533, 'hrs/SF', 'Pool', 15.01, 'Glass tile raised surface — hrs per SF'),
  ('Raised - MSI Ledgerstone',        0.200, 'hrs/SF', 'Pool', 40.00, 'MSI Ledgerstone raised surface — hrs per SF'),
  ('Raised - Flat Flagstone Arizona', 0.220, 'hrs/SF', 'Pool', 36.36, 'Flat Arizona flagstone raised surface — hrs per SF'),
  ('Raised - Flat Flagstone Other',   0.220, 'hrs/SF', 'Pool', 36.36, 'Flat other flagstone raised surface — hrs per SF'),
  ('Raised - Stucco',                 0.100, 'hrs/SF', 'Pool', 80.00, 'Stucco raised surface — hrs per SF'),
  ('Raised - Integral Color Stucco',  0.110, 'hrs/SF', 'Pool', 72.73, 'Integral color stucco raised surface — hrs per SF'),
-- Excavation rates (CY/hr net)
  ('Excavation - IH Bobcat 72"',       7.33,  'CY/hr', 'Pool', 58.64, 'IH Bobcat 72" W x 77" HT — net CY per hour'),
  ('Excavation - IH Bobcat 64"',       7.14,  'CY/hr', 'Pool', 57.12, 'IH Bobcat 64" — net CY per hour'),
  ('Excavation - Rental 48"',          7.33,  'CY/hr', 'Pool', 58.64, 'Rental 48" bobcat — net CY per hour'),
  ('Excavation - Rental 42"',          7.33,  'CY/hr', 'Pool', 58.64, 'Rental 42" bobcat — net CY per hour'),
  ('Excavation - Medium Excavator',   29.75,  'CY/hr', 'Pool', 238.00,'Medium excavator — net CY per hour'),
  ('Excavation - Large Excavator',    25.50,  'CY/hr', 'Pool', 204.00,'Large excavator — net CY per hour'),
  ('Excavation - Hand Dig',            0.50,  'CY/hr', 'Pool', 4.00,  'Hand dig excavation — net CY per hour');
