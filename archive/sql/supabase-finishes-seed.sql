-- ─────────────────────────────────────────────────────────────────────────────
-- Finishes Module: Material & Labor Rates Seed
-- ─────────────────────────────────────────────────────────────────────────────

-- Material Rates for Finishes module
INSERT INTO material_rates (name, unit, unit_cost, category) VALUES
  ('Finishes Tile Flatwork', 'per SF', 6.50, 'Finishes'),
  ('Finishes Brick Flatwork', 'per brick', 3.00, 'Finishes'),
  ('Finishes Flagstone Flatwork', 'per ton', 400.00, 'Finishes'),
  ('Finishes Porcelain Flatwork', 'per SF', 10.00, 'Finishes'),
  ('Finishes Cap Flagstone', 'per ton', 500.00, 'Finishes'),
  ('Finishes Cap Precast', 'per piece', 50.00, 'Finishes'),
  ('Finishes Cap Bullnose Brick', 'per LF', 5.00, 'Finishes'),
  ('Finishes Concrete Truck', 'per CY', 185.00, 'Finishes'),
  ('Sand Stucco - Finishes', 'per SF', 0.00, 'Finishes'),
  ('Smooth Stucco - Finishes', 'per SF', 0.00, 'Finishes'),
  ('Ledgerstone - Finishes', 'per SF', 10.00, 'Finishes'),
  ('Stacked Stone - Finishes', 'per SF', 10.00, 'Finishes'),
  ('Tile - Finishes', 'per SF', 6.50, 'Finishes'),
  ('Real Flagstone - Finishes', 'per ton', 400.00, 'Finishes'),
  ('Real Stone - Finishes', 'per ton', 400.00, 'Finishes')
ON CONFLICT DO NOTHING;

-- Labor Rates for Finishes module
INSERT INTO labor_rates (name, rate, unit, category) VALUES
  ('Finishes Tile Flatwork Labor Rate', 0.2867, 'hrs/SF', 'Finishes'),
  ('Finishes Brick Flatwork Labor Rate', 0.35, 'hrs/SF', 'Finishes'),
  ('Finishes Flagstone Flatwork Labor Rate', 0.4487, 'hrs/SF', 'Finishes'),
  ('Finishes Porcelain Flatwork Labor Rate', 0.267, 'hrs/SF', 'Finishes'),
  ('Sand Stucco - Finishes Labor Rate', 92.00, 'SF/day', 'Finishes'),
  ('Smooth Stucco - Finishes Labor Rate', 65.00, 'SF/day', 'Finishes'),
  ('Ledgerstone - Finishes Labor Rate', 24.00, 'SF/day', 'Finishes'),
  ('Stacked Stone - Finishes Labor Rate', 24.00, 'SF/day', 'Finishes'),
  ('Tile - Finishes Labor Rate', 0.2867, 'hrs/SF', 'Finishes'),
  ('Real Flagstone - Finishes Labor Rate', 0.4487, 'hrs/SF', 'Finishes'),
  ('Real Stone - Finishes Labor Rate', 0.8954, 'hrs/SF', 'Finishes')
ON CONFLICT DO NOTHING;
