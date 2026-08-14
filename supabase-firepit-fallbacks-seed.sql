-- ============================================================================
-- Fire Pit: guarantee every rate that USED to have a code fallback now exists in a
-- table, so deleting the module's hardcoded fallbacks can't zero out an estimate.
-- Values are the OLD code fallbacks. INSERT-ONLY where the rate is missing —
-- never overwrites a value you've already set. Idempotent; run on prod + staging
-- BEFORE deploying the fallback-free Fire Pit module. Mirrors
-- supabase-drainage-fallbacks-seed.sql.
-- ============================================================================

-- Labor coefficients -> labor_rates (category 'Fire Pit').
insert into public.labor_rates (tenant_id, name, rate, category)
select coalesce((select tenant_id from public.labor_rates where category = 'Fire Pit' limit 1), (select tenant_id from public.labor_rates limit 1)), v.name, v.rate, 'Fire Pit'
from (values
  ('FP Cap Flagstone Labor Rate', 0.25),
  ('FP Cap Precast Labor Rate', 0.2),
  ('FP Cap PIP Concrete Labor Rate', 0.15),
  ('FP Cap Bullnose Brick Labor Rate', 0.08),
  ('FP Dig Footing Labor Rate', 4.0),
  ('FP Set Rebar Labor Rate', 35.0),
  ('FP Set Blocks Labor Rate', 10.4),
  ('FP Hand Grout Labor Rate', 5.5),
  ('FP Pump Grout Labor Rate', 81.0),
  ('Sand Stucco - FP Labor Rate', 92),
  ('Smooth Stucco - FP Labor Rate', 65),
  ('Ledgerstone - FP Labor Rate', 24),
  ('Stacked Stone - FP Labor Rate', 24),
  ('Tile - FP Labor Rate', 0.2867),
  ('Real Flagstone - FP Labor Rate', 0.4487),
  ('Real Stone - FP Labor Rate', 0.8954),
  ('FP Brick Lay Labor Rate', 1.75),
  ('FP Form Labor Rate', 0.08),
  ('FP Pour Concrete Labor Rate', 1.5)
) as v(name, rate)
where not exists (
  select 1 from public.labor_rates l where l.name = v.name and l.category = 'Fire Pit'
);

-- Material / misc -> misc_rates (category 'Fire Pit'); skipped if the catalog already
-- carries the item (material.description) or the misc row already exists.
insert into public.misc_rates (tenant_id, name, rate, category)
select coalesce((select tenant_id from public.labor_rates where category = 'Fire Pit' limit 1), (select tenant_id from public.labor_rates limit 1)), v.name, v.rate, 'Fire Pit'
from (values
  ('FP Block', 2.5),
  ('FP Rebar', 0.5),
  ('FP Concrete', 149.5),
  ('FP Grout Pump Setup', 150.0),
  ('FP Sub Structure $/LF', 0),
  ('FP Sub Structure Ht $/SF', 0),
  ('FP Cap Flagstone', 18.0),
  ('FP Cap Precast', 12.0),
  ('FP Cap PIP Concrete', 10.0),
  ('FP Cap Bullnose Brick', 5.0),
  ('Sand Stucco - FP', 0.0),
  ('Smooth Stucco - FP', 0.0),
  ('Ledgerstone - FP', 10.0),
  ('Stacked Stone - FP', 10.0),
  ('Tile - FP', 6.5),
  ('Real Flagstone - FP', 400.0),
  ('Real Stone - FP', 400.0)
) as v(name, rate)
where not exists (select 1 from public.misc_rates m where m.name = v.name and m.category = 'Fire Pit')
  and not exists (select 1 from public.material mat where mat.description = v.name);

-- Shared Gas / Utility rates (category 'Utilities') used by the Fire Pit gas
-- sections. Material is normally catalog-resolved; these fill any gap. Shared
-- with the Utilities + Outdoor Kitchen modules (safe, insert-only).

-- Labor coefficients -> labor_rates (category 'Utilities').
insert into public.labor_rates (tenant_id, name, rate, category)
select coalesce((select tenant_id from public.labor_rates where category = 'Fire Pit' limit 1), (select tenant_id from public.labor_rates limit 1)), v.name, v.rate, 'Utilities'
from (values
  ('Utilities Trench Excavation', 10),
  ('1-1/2" Poly Gas Pipe - Labor Rate', 0.05),
  ('1" Black Iron Gas Pipe - Labor Rate', 0.15),
  ('1-1/2" Black Iron Gas Pipe - Labor Rate', 0.2),
  ('2" Black Iron Gas Pipe - Labor Rate', 0.25),
  ('12" Single Gas Ring - Labor Rate', 2),
  ('18" Single Gas Ring - Labor Rate', 2),
  ('24" Single Gas Ring - Labor Rate', 2),
  ('24" Double Gas Ring - Labor Rate', 2),
  ('2'' Straight Gas Bar - Labor Rate', 2),
  ('3'' Straight Gas Bar - Labor Rate', 2.5),
  ('4'' Straight Gas Bar - Labor Rate', 3),
  ('Gas Shut-Off Valve - Labor Rate', 2)
) as v(name, rate)
where not exists (
  select 1 from public.labor_rates l where l.name = v.name and l.category = 'Utilities'
);

-- Gas line/fixture material -> misc_rates (category 'Utilities'); skipped if the catalog already
-- carries the item (material.description) or the misc row already exists.
insert into public.misc_rates (tenant_id, name, rate, category)
select coalesce((select tenant_id from public.labor_rates where category = 'Fire Pit' limit 1), (select tenant_id from public.labor_rates limit 1)), v.name, v.rate, 'Utilities'
from (values
  ('1-1/2" Poly Gas Pipe', 4.25),
  ('1" Black Iron Gas Pipe', 2.76),
  ('1-1/2" Black Iron Gas Pipe', 4.23),
  ('2" Black Iron Gas Pipe', 5.72),
  ('12" Single Gas Ring', 61.75),
  ('18" Single Gas Ring', 84.75),
  ('24" Single Gas Ring', 107.75),
  ('24" Double Gas Ring', 163.25),
  ('2'' Straight Gas Bar', 35.5),
  ('3'' Straight Gas Bar', 56.0),
  ('4'' Straight Gas Bar', 68.5),
  ('Gas Shut-Off Valve', 89.7)
) as v(name, rate)
where not exists (select 1 from public.misc_rates m where m.name = v.name and m.category = 'Utilities')
  and not exists (select 1 from public.material mat where mat.description = v.name);
