-- ─────────────────────────────────────────────────────────────────────────────
-- Pool Module — Subcontractor Pricing Seed Data
-- Run this once in the Supabase SQL Editor.
-- Populates the Subcontractor Pricing panel (Master Rates) with all Pool
-- sub cost rates. The Pool module calculator reads these rates live.
--
-- Fields: company_name (label shown in UI), trade (key used by module),
--         rate (numeric value), unit (display only), category = 'Pool'
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO subcontractor_rates (company_name, trade, rate, unit, category) VALUES

-- ── Shotcrete ────────────────────────────────────────────────────────────────
  ('Pool Shotcrete Sub', 'Shotcrete Material',       200.00, '$/CY',      'Pool'),
  ('Pool Shotcrete Sub', 'Shotcrete Labor',            85.00, '$/CY',      'Pool'),
  ('Pool Shotcrete Sub', 'Shotcrete Minimum Labor',  3500.00, 'each',      'Pool'),

-- ── Interior Finish ──────────────────────────────────────────────────────────
  ('Pool Finish Sub',    'Interior Finish - White Plaster',  45.00, '$/SF', 'Pool'),
  ('Pool Finish Sub',    'Interior Finish - Quartzscapes',   87.00, '$/SF', 'Pool'),
  ('Pool Finish Sub',    'Interior Finish - Stonescapes',    83.00, '$/SF', 'Pool'),

-- ── Plumbing ─────────────────────────────────────────────────────────────────
  ('Pool Plumbing Sub',  'Plumbing Pool Only',         4500.00, 'lump sum', 'Pool'),
  ('Pool Plumbing Sub',  'Plumbing Pool + Spa',        6000.00, 'lump sum', 'Pool'),
  ('Pool Plumbing Sub',  'Plumbing Over 20ft Add',      300.00, 'each',     'Pool'),
  ('Pool Plumbing Sub',  'Plumbing Remodel Add',        200.00, 'each',     'Pool'),
  ('Pool Plumbing Sub',  'Plumbing Extra Light',        150.00, '$/ea',     'Pool'),
  ('Pool Plumbing Sub',  'Plumbing Sheer Descent',      450.00, '$/ea',     'Pool'),

-- ── Steel ────────────────────────────────────────────────────────────────────
  ('Pool Steel Sub',     'Steel Per LF',                  8.00, '$/LF',     'Pool'),
  ('Pool Steel Sub',     'Steel Spa Bonus',             200.00, 'each',     'Pool');
