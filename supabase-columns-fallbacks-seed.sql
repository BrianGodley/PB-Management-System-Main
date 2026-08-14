-- ============================================================================
-- Columns: guarantee every rate that USED to have a code fallback now exists in a
-- table, so deleting the module's hardcoded fallbacks can't zero out an estimate.
-- Values are the OLD code fallbacks. INSERT-ONLY where the rate is missing —
-- never overwrites a value you've already set. Idempotent; run on prod + staging
-- BEFORE deploying the fallback-free Columns module. Mirrors
-- supabase-drainage-fallbacks-seed.sql.
-- ============================================================================

-- Labor coefficients -> labor_rates (category 'Columns').
insert into public.labor_rates (tenant_id, name, rate, category)
select coalesce((select tenant_id from public.labor_rates where category = 'Columns' limit 1), (select tenant_id from public.labor_rates limit 1)), v.name, v.rate, 'Columns'
from (values
  ('CMU Install Labor', 0.083),
  ('Excavate Footing Labor', 0.5),
  ('Pour Footing Labor', 0.25),
  ('Fill Labor', 0.05),
  ('Column Brick Lay Labor', 1.75),
  ('Column Form Labor', 0.08),
  ('Column Pour Labor', 1.5),
  ('Sand Stucco - Labor Rate', 0.05),
  ('Smooth Stucco - Labor Rate', 0.05),
  ('Ledgerstone Veneer Panels - Labor Rate', 0.1),
  ('Stacked Stone Veneer - Labor Rate', 0.1),
  ('Tile - Columns - Labor Rate', 0.125),
  ('Real Flagstone Flat - Labor Rate', 0.5),
  ('Real Stone - Columns - Labor Rate', 0.5)
) as v(name, rate)
where not exists (
  select 1 from public.labor_rates l where l.name = v.name and l.category = 'Columns'
);

-- Material / misc -> misc_rates (category 'Columns'); skipped if the catalog already
-- carries the item (material.description) or the misc row already exists.
insert into public.misc_rates (tenant_id, name, rate, category)
select coalesce((select tenant_id from public.labor_rates where category = 'Columns' limit 1), (select tenant_id from public.labor_rates limit 1)), v.name, v.rate, 'Columns'
from (values
  ('CMU Block', 2.5),
  ('Sand Stucco', 0),
  ('Smooth Stucco', 0),
  ('Ledgerstone Veneer Panels', 10.0),
  ('Stacked Stone Veneer', 10.0),
  ('Tile - Columns', 6.5),
  ('Real Flagstone Flat', 400.0),
  ('Real Stone - Columns', 400.0),
  ('Sand Stucco - Sub SF', 0),
  ('Smooth Stucco - Sub SF', 0),
  ('Ledgerstone Veneer Panels - Sub SF', 0),
  ('Stacked Stone Veneer - Sub SF', 0),
  ('Tile - Columns - Sub SF', 0),
  ('Real Flagstone Flat - Sub SF', 0),
  ('Real Stone - Columns - Sub SF', 0)
) as v(name, rate)
where not exists (select 1 from public.misc_rates m where m.name = v.name and m.category = 'Columns')
  and not exists (select 1 from public.material mat where mat.description = v.name);

-- NOTE: rebar (Rebar #3..#8) and grout concrete ('Concrete - Ready Mix (Truck)',
-- old fb 185) resolve from the canonical 'Basic Materials' catalog, and the CMU
-- block picker resolves from the 'Wall Block' catalog sub-category. Those are
-- already seeded (Basic Materials / catalog); no fallback seed needed here. The
-- 'Rebar' (fb 1.388) name was only a fallback and is no longer read by name.
