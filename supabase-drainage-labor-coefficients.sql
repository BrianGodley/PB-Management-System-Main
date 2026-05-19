-- Seed Drainage module's hidden labor coefficients into labor_rates so they
-- can be edited from the estimate's inline calculator icon. Each row matches
-- a hardcoded constant in src/components/modules/DrainageModule.jsx — when
-- the user adjusts it via the popover, the new value is persisted here.
--
-- Safe to re-run: uses ON CONFLICT (name, category) — assuming you have a
-- unique index on those. If not, the ON CONFLICT block is skipped and
-- duplicates may appear; in that case dedupe manually or add the index.

-- TRENCHING — minutes per cubic foot, keyed by equipment type
INSERT INTO public.labor_rates (name, rate, unit, category, notes) VALUES
  ('Drainage Trench Excavation', 10,   'min/cf', 'Drainage', 'Minutes of labor per cubic foot when digging with a Trench machine'),
  ('Drainage Hand Excavation',   12.5, 'min/cf', 'Drainage', 'Minutes of labor per cubic foot when digging by Hand')
ON CONFLICT DO NOTHING;

-- PIPE LABOR — hours per linear foot, keyed by pipe type
INSERT INTO public.labor_rates (name, rate, unit, category, notes) VALUES
  ('Drainage 4" SDR 35 Pipe Labor',      0.0495, 'hr/LF', 'Drainage', 'Labor hours per linear foot for 4" SDR 35 pipe install'),
  ('Drainage 3" SDR 35 Pipe Labor',      0.045,  'hr/LF', 'Drainage', 'Labor hours per linear foot for 3" SDR 35 pipe install'),
  ('Drainage 6" SDR 35 Pipe Labor',      0.06,   'hr/LF', 'Drainage', 'Labor hours per linear foot for 6" SDR 35 pipe install'),
  ('Drainage 4" Triple Wall Pipe Labor', 0.05,   'hr/LF', 'Drainage', 'Labor hours per linear foot for 4" Triple Wall pipe install'),
  ('Drainage 3" Triple Wall Pipe Labor', 0.045,  'hr/LF', 'Drainage', 'Labor hours per linear foot for 3" Triple Wall pipe install'),
  ('Drainage 4" Perforated Pipe Labor',  0.05,   'hr/LF', 'Drainage', 'Labor hours per linear foot for 4" Perforated pipe install'),
  ('Drainage 3" Perforated Pipe Labor',  0.045,  'hr/LF', 'Drainage', 'Labor hours per linear foot for 3" Perforated pipe install')
ON CONFLICT DO NOTHING;

-- FIXTURE LABOR — hours per fixture, keyed by fixture type
INSERT INTO public.labor_rates (name, rate, unit, category, notes) VALUES
  ('Drainage 3" Area Drain Labor',         0.495, 'hr/ea', 'Drainage', 'Labor hours per 3" Area Drain install'),
  ('Drainage 4" Area Drain Labor',         0.495, 'hr/ea', 'Drainage', 'Labor hours per 4" Area Drain install'),
  ('Drainage 3" Atrium Drain Labor',       0.495, 'hr/ea', 'Drainage', 'Labor hours per 3" Atrium Drain install'),
  ('Drainage 4" Atrium Drain Labor',       0.495, 'hr/ea', 'Drainage', 'Labor hours per 4" Atrium Drain install'),
  ('Drainage 4" Brass Area Drain Labor',   0.495, 'hr/ea', 'Drainage', 'Labor hours per 4" Brass Area Drain install'),
  ('Drainage 3" Brass Area Drain Labor',   0.495, 'hr/ea', 'Drainage', 'Labor hours per 3" Brass Area Drain install'),
  ('Drainage Downspout Connector Labor',   0.495, 'hr/ea', 'Drainage', 'Labor hours per Downspout Connector install'),
  ('Drainage 4" Paver Top Inlet Labor',    0.75,  'hr/ea', 'Drainage', 'Labor hours per 4" Paver Top Inlet install'),
  ('Drainage 9" x 9" Catch Basin Labor',   0.495, 'hr/ea', 'Drainage', 'Labor hours per 9" x 9" Catch Basin install'),
  ('Drainage 12" x 12" Catch Basin Labor', 0.495, 'hr/ea', 'Drainage', 'Labor hours per 12" x 12" Catch Basin install')
ON CONFLICT DO NOTHING;

-- ADDITIONAL ITEM LABOR — hours per unit
INSERT INTO public.labor_rates (name, rate, unit, category, notes) VALUES
  ('Drainage Pump Vault Labor',                5, 'hr/ea', 'Drainage', 'Labor hours per Pump Vault install'),
  ('Drainage Sump Pump Labor',                 3, 'hr/ea', 'Drainage', 'Labor hours per Sump Pump install'),
  ('Drainage Curb Core Labor',                 2, 'hr/ea', 'Drainage', 'Labor hours per Curb Core'),
  ('Drainage Hydrocut Under Hardscape Labor',  2, 'hr/ea', 'Drainage', 'Labor hours per Hydrocut Under Hardscape')
ON CONFLICT DO NOTHING;
