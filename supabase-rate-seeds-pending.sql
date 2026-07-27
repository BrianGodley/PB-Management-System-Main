-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-rate-seeds-pending.sql
--
-- Running log of rate-seed INSERTs added while building modules. All are
-- additive (ON CONFLICT DO NOTHING) and safe to re-run. The code carries
-- fallback defaults, so a DB missing these rows still works — the row only
-- matters for Edit Rates persistence + showing the rate in Master Rates.
--
-- WORKFLOW: run new blocks on PROD when shipped; replay this whole file on
-- STAGING to backfill. Every block uses a tenant cross-join so it works on
-- both databases (different tenant ids) without editing.
--
-- Once a block has been run on BOTH prod and staging, you can delete it or
-- move it to a "done" file — ON CONFLICT keeps re-runs harmless either way.
-- ─────────────────────────────────────────────────────────────────────────────


-- ═════════════════════════════════════════════════════════════════════════════
-- CONCRETE — labor_rates : In-House install size tiers + finish coefficients
-- (2026-07-27)
-- ═════════════════════════════════════════════════════════════════════════════
INSERT INTO public.labor_rates (name, rate, unit, category, notes, tenant_id)
SELECT v.name, v.rate, v.unit, 'Concrete', v.notes, t.tenant_id
FROM (VALUES
  ('Concrete - Install 100-300',         6.5, 'SF/hr', 'In-House pour+finish, 100-300 SF jobs'),
  ('Concrete - Install 300-600',         12,  'SF/hr', 'In-House pour+finish, 300-600 SF jobs'),
  ('Concrete - Install 600-1000',        20,  'SF/hr', 'In-House pour+finish, 600-1000 SF jobs'),
  ('Concrete - Install 1000-2000',       24,  'SF/hr', 'In-House pour+finish, 1000-2000 SF jobs'),
  ('Concrete - Install 2000+',           28,  'SF/hr', 'In-House pour+finish, 2000+ SF jobs'),
  ('Concrete - Sand Finish SF/hr',       100, 'SF/hr', 'Sand finish labor coefficient'),
  ('Concrete - Salt Finish SF/hr',       25,  'SF/hr', 'Salt finish labor coefficient'),
  ('Concrete - Exposed Aggregate SF/hr', 50,  'SF/hr', 'Exposed aggregate finish labor coefficient'),
  ('Concrete - Seeded Aggregate SF/hr',  40,  'SF/hr', 'Seeded aggregate finish labor coefficient')
) AS v(name, rate, unit, notes)
CROSS JOIN (SELECT DISTINCT tenant_id FROM public.labor_rates) AS t
ON CONFLICT DO NOTHING;


-- ═════════════════════════════════════════════════════════════════════════════
-- DRAINAGE — subcontractor_rates : Sub-tab flat Drain Fixtures + Additional Items
-- (2026-07-27)
-- ═════════════════════════════════════════════════════════════════════════════
INSERT INTO public.subcontractor_rates (company_name, rate, category, notes, tenant_id)
SELECT v.company_name, v.rate, 'Drainage', v.notes, t.tenant_id
FROM (VALUES
  ('Drainage Sub - Fixture Flat',    20,  'Sub tab - flat cost per drain fixture'),
  ('Drainage Sub - Pump Vault',      250, 'Sub tab - flat labor per pump vault'),
  ('Drainage Sub - Sump Pump',       300, 'Sub tab - flat labor per sump pump'),
  ('Drainage Sub - Curb Core',       250, 'Sub tab - flat labor per curb core'),
  ('Drainage Sub - Hydrocut Per LF', 10,  'Sub tab - hydro cut per linear foot')
) AS v(company_name, rate, notes)
CROSS JOIN (SELECT DISTINCT tenant_id FROM public.subcontractor_rates) AS t
ON CONFLICT DO NOTHING;


-- ═════════════════════════════════════════════════════════════════════════════
-- CONCRETE — subcontractor_rates : Sub-tab vapor barrier + sealer (flat $/SF)
-- (2026-07-27)
-- ═════════════════════════════════════════════════════════════════════════════
INSERT INTO public.subcontractor_rates (company_name, rate, category, notes, tenant_id)
SELECT v.company_name, v.rate, 'Concrete', v.notes, t.tenant_id
FROM (VALUES
  ('Concrete Sub - Vapor Barrier Per SF', 1, 'Sub tab - vapor barrier flat $/SF'),
  ('Concrete Sub - Sealer Per SF',        3, 'Sub tab - sealer flat $/SF')
) AS v(company_name, rate, notes)
CROSS JOIN (SELECT DISTINCT tenant_id FROM public.subcontractor_rates) AS t
ON CONFLICT DO NOTHING;


-- ═════════════════════════════════════════════════════════════════════════════
-- CONCRETE — subcontractor_rates : Sub-tab per-finish modifier ($/SF + material)
-- (2026-07-27)
-- ═════════════════════════════════════════════════════════════════════════════
INSERT INTO public.subcontractor_rates (company_name, rate, category, notes, tenant_id)
SELECT v.company_name, v.rate, 'Concrete', v.notes, t.tenant_id
FROM (VALUES
  ('Concrete Sub - Sand Finish Per SF',           2,    'Sub finish modifier - sand $/SF'),
  ('Concrete Sub - Salt Finish Per SF',           3,    'Sub finish modifier - salt $/SF'),
  ('Concrete Sub - Stamped Per SF',               3,    'Sub finish modifier - stamped $/SF'),
  ('Concrete Sub - Exposed Aggregate Per SF',     5,    'Sub finish modifier - exposed aggregate labor $/SF'),
  ('Concrete Sub - Exposed Aggregate Mat Per SF', 2.75, 'Sub finish modifier - exposed aggregate material $/SF'),
  ('Concrete Sub - Seeded Aggregate Per SF',      4.5,  'Sub finish modifier - seeded aggregate labor $/SF'),
  ('Concrete Sub - Seeded Aggregate Mat Per SF',  1.75, 'Sub finish modifier - seeded aggregate material $/SF')
) AS v(company_name, rate, notes)
CROSS JOIN (SELECT DISTINCT tenant_id FROM public.subcontractor_rates) AS t
ON CONFLICT DO NOTHING;


-- ═════════════════════════════════════════════════════════════════════════════
-- ARTIFICIAL TURF — labor_rates : DB-editable install + strip labor rates
-- (2026-07-27)
-- ═════════════════════════════════════════════════════════════════════════════
INSERT INTO public.labor_rates (name, rate, unit, category, notes, tenant_id)
SELECT v.name, v.rate, v.unit, 'Artificial Turf', v.notes, t.tenant_id
FROM (VALUES
  ('Turf - Turf Install SF/hr',  20,   'SF/hr', 'In-House turf installation layout labor rate'),
  ('Turf - Strip Install LF/hr', 12.5, 'LF/hr', 'In-House narrow/custom turf strip install labor rate')
) AS v(name, rate, unit, notes)
CROSS JOIN (SELECT DISTINCT tenant_id FROM public.labor_rates) AS t
ON CONFLICT DO NOTHING;


-- ═════════════════════════════════════════════════════════════════════════════
-- ARTIFICIAL TURF — subcontractor_rates : Sub-tab SF/LF install rates
-- (2026-07-27)
-- ═════════════════════════════════════════════════════════════════════════════
INSERT INTO public.subcontractor_rates (company_name, rate, category, notes, tenant_id)
SELECT v.company_name, v.rate, 'Artificial Turf', v.notes, t.tenant_id
FROM (VALUES
  ('Turf Sub - Install Per SF', 3,  'Sub turf install labor $/SF (on top of material)'),
  ('Turf Sub - Strip Per LF',   10, 'Sub turf strip install $/LF (plus material)')
) AS v(company_name, rate, notes)
CROSS JOIN (SELECT DISTINCT tenant_id FROM public.subcontractor_rates) AS t
ON CONFLICT DO NOTHING;


-- ═════════════════════════════════════════════════════════════════════════════
-- GROUND TREATMENTS — labor_rates : Mulch / DG / Gravel / Stepper labor rates
-- (2026-07-27)
-- ═════════════════════════════════════════════════════════════════════════════
INSERT INTO public.labor_rates (name, rate, unit, category, notes, tenant_id)
SELECT v.name, v.rate, v.unit, 'Ground Treatments', v.notes, t.tenant_id
FROM (VALUES
  ('Mulch - Labor Rate',                    15,  'CY/day', 'Mulch spread labor rate'),
  ('DG - Hand Labor Rate',                  0.5, 'CY/hr',  'Decomposed granite hand install rate'),
  ('DG - Machine Labor Rate',               12,  'CY/day', 'Decomposed granite machine install rate'),
  ('Gravel - Machine Labor Rate',           12,  'CY/day', 'Gravel machine excavation rate'),
  ('Gravel - Hand Labor Rate',              4,   'CY/day', 'Gravel hand excavation rate'),
  ('Flagstone Steppers - Soil Labor',       35,  'SF/day', 'Flagstone stepper labor - soil set'),
  ('Flagstone Steppers - Concrete Labor',   25,  'SF/day', 'Flagstone stepper labor - concrete set'),
  ('Precast Steppers - Soil Labor',         50,  'SF/day', 'Precast stepper labor - soil set'),
  ('Precast Steppers - Concrete Labor',     35,  'SF/day', 'Precast stepper labor - concrete set')
) AS v(name, rate, unit, notes)
CROSS JOIN (SELECT DISTINCT tenant_id FROM public.labor_rates) AS t
ON CONFLICT DO NOTHING;


-- ═════════════════════════════════════════════════════════════════════════════
-- GROUND TREATMENTS — material_rates : Gravel type $/CY (placeholder 130, update later)
-- (2026-07-27)
-- ═════════════════════════════════════════════════════════════════════════════
INSERT INTO public.material_rates (name, unit_cost, category, notes, tenant_id)
SELECT v.name, v.unit_cost, 'Ground Treatments', v.notes, t.tenant_id
FROM (VALUES
  ('Gravel - Crushed Pea Gravel',        95,  'C&M 1/4" Crushed Pea Gravel $/CY (2026-05-22)'),
  ('Gravel - 3/4" Crushed Gravel',       79,  'C&M 3/4" Crushed Gravel $/CY (2026-05-22)'),
  ('Gravel - Del Rio',                   200, 'C&M Del Rio Pebble $/CY (2026-05-22)'),
  ('Gravel - Black River Rock 1in minus', 130, 'Gravel type $/CY - placeholder, no C&M match'),
  ('Gravel - Black River Rock 1in-2in',  130, 'Gravel type $/CY - placeholder, no C&M match'),
  ('Gravel - Black River Rock 2in-3in',  130, 'Gravel type $/CY - placeholder, no C&M match')
) AS v(name, unit_cost, notes)
CROSS JOIN (SELECT DISTINCT tenant_id FROM public.material_rates) AS t
ON CONFLICT DO NOTHING;


-- ═════════════════════════════════════════════════════════════════════════════
-- GROUND TREATMENTS — material_rates : Mulch product types ($/CY, C&M 2026-05-22)
-- (2026-07-27)
-- ═════════════════════════════════════════════════════════════════════════════
INSERT INTO public.material_rates (name, unit_cost, category, notes, tenant_id)
SELECT v.name, v.unit_cost, 'Ground Treatments', v.notes, t.tenant_id
FROM (VALUES
  ('Mulch - Premium',          20, 'C&M Premium Mulch $/CY'),
  ('Mulch - Brown Shredded',   20, 'C&M Brown Shredded $/CY'),
  ('Mulch - Flower Bed',       28, 'C&M Flower Bed Mulch $/CY'),
  ('Mulch - Shredded Cedar',   80, 'C&M Shredded Cedar / Gorilla Hair $/CY'),
  ('Mulch - Forest Moss',      80, 'C&M Forest Moss (triple grind cedar) $/CY'),
  ('Mulch - Black Dyed Chips', 32, 'C&M Black Dyed Wood Chips $/CY'),
  ('Mulch - Brown Dyed Chips', 32, 'C&M Brown Dyed Wood Chips $/CY'),
  ('Mulch - Red Dyed Chips',   32, 'C&M Red Dyed Wood Chips $/CY'),
  ('Mulch - Playground Chips', 60, 'C&M Certified Playground Chips $/CY'),
  ('Mulch - Walk On Bark',     85, 'C&M Walk On Bark 2"-3" $/CY'),
  ('Mulch - Small Bark Nugget', 85, 'C&M Small Bark Nugget 1/2"-3/4" $/CY'),
  ('Mulch - Medium Bark Nugget', 85, 'C&M Medium Bark Nugget 1"-1 3/4" $/CY')
) AS v(name, unit_cost, notes)
CROSS JOIN (SELECT DISTINCT tenant_id FROM public.material_rates) AS t
ON CONFLICT DO NOTHING;
