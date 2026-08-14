-- ============================================================================
-- Outdoor Kitchen: guarantee every rate that USED to have a code fallback now exists in a
-- table, so deleting the module's hardcoded fallbacks can't zero out an estimate.
-- Values are the OLD code fallbacks. INSERT-ONLY where the rate is missing —
-- never overwrites a value you've already set. Idempotent; run on prod + staging
-- BEFORE deploying the fallback-free Outdoor Kitchen module. Mirrors
-- supabase-drainage-fallbacks-seed.sql.
-- ============================================================================

-- Labor coefficients -> labor_rates (category 'Outdoor Kitchen').
insert into public.labor_rates (tenant_id, name, rate, category)
select coalesce((select tenant_id from public.labor_rates where category = 'Outdoor Kitchen' limit 1), (select tenant_id from public.labor_rates limit 1)), v.name, v.rate, 'Outdoor Kitchen'
from (values
  ('BBQ Excavate Labor Rate', 5),
  ('BBQ Rebar Labor Rate', 18.25),
  ('BBQ Pour Footing Labor Rate', 4),
  ('BBQ Block Install Labor Rate', 7.5),
  ('BBQ Fill Block Labor Rate', 18.25),
  ('BBQ Counter Form Labor Rate', 20),
  ('BBQ Counter Pour Labor Rate', 6.25),
  ('BBQ Counter Broom Labor Rate', 7.5),
  ('BBQ Counter Polish Labor Rate', 2.25),
  ('BBQ Counter Trowel Labor Rate', 5.625),
  ('BBQ Appliance Labor Rate', 2.75),
  ('BBQ Appliance Install Hrs', 2.9),
  ('BBQ GFIC Labor Rate', 2),
  ('BBQ Sink Labor Rate', 4),
  ('BBQ Gas Trench Labor Rate', 35),
  ('Sand Stucco - BBQ Labor Rate', 92),
  ('Smooth Stucco - BBQ Labor Rate', 65),
  ('Ledgerstone - BBQ Labor Rate', 24),
  ('Stacked Stone - BBQ Labor Rate', 24),
  ('Tile - BBQ Labor Rate', 0.2867),
  ('Real Flagstone - BBQ Labor Rate', 0.4487),
  ('Real Stone - BBQ Labor Rate', 0.8954)
) as v(name, rate)
where not exists (
  select 1 from public.labor_rates l where l.name = v.name and l.category = 'Outdoor Kitchen'
);

-- Material / misc -> misc_rates (category 'Outdoor Kitchen'); skipped if the catalog already
-- carries the item (material.description) or the misc row already exists.
insert into public.misc_rates (tenant_id, name, rate, category)
select coalesce((select tenant_id from public.labor_rates where category = 'Outdoor Kitchen' limit 1), (select tenant_id from public.labor_rates limit 1)), v.name, v.rate, 'Outdoor Kitchen'
from (values
  ('BBQ Block', 2.5),
  ('BBQ Rebar', 0.4),
  ('BBQ Concrete', 149.5),
  ('BBQ Sub Wall LF', 150.0),
  ('BBQ Sub Backsplash LF', 100.0),
  ('BBQ Appliance Hardware', 3.0),
  ('GFIC Outlet - BBQ', 80.0),
  ('Sink Plumbing - BBQ', 115.0),
  ('Gas Pipe - BBQ', 3.0),
  ('Sand Stucco - BBQ', 0.0),
  ('Smooth Stucco - BBQ', 0.0),
  ('Ledgerstone - BBQ', 10.0),
  ('Stacked Stone - BBQ', 10.0),
  ('Tile - BBQ', 6.5),
  ('Real Flagstone - BBQ', 400.0),
  ('Real Stone - BBQ', 400.0)
) as v(name, rate)
where not exists (select 1 from public.misc_rates m where m.name = v.name and m.category = 'Outdoor Kitchen')
  and not exists (select 1 from public.material mat where mat.description = v.name);

-- Shared Gas / Utility Line / Electrical rates (category 'Utilities') used by
-- the OK Electrical & Plumbing sections. Material is normally catalog-resolved;
-- these fill any gap. Shared with Utilities + Fire Pit (safe, insert-only).

-- Labor coefficients -> labor_rates (category 'Utilities').
insert into public.labor_rates (tenant_id, name, rate, category)
select coalesce((select tenant_id from public.labor_rates where category = 'Outdoor Kitchen' limit 1), (select tenant_id from public.labor_rates limit 1)), v.name, v.rate, 'Utilities'
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
  ('Gas Shut-Off Valve - Labor Rate', 2),
  ('PVC Conduit with Electrical - Labor Rate', 0.05),
  ('Electric Sub-panel - Labor Rate', 4.5),
  ('Electric Disconnect - Labor Rate', 2.5),
  ('GFCI Protected Receptacles - Labor Rate', 2),
  ('Bubble Covers for Receptacles - Labor Rate', 0.25),
  ('Infratech W2024SS 2000W 240V Heater (Stainless) - Labor Rate', 6),
  ('Infratech W39 Flush Mount Frame - Labor Rate', 2),
  ('Infratech Single Duplex Switch in Surface Mount Gang Box - Labor Rate', 2)
) as v(name, rate)
where not exists (
  select 1 from public.labor_rates l where l.name = v.name and l.category = 'Utilities'
);

-- Line/gas/electrical material -> misc_rates (category 'Utilities'); skipped if the catalog already
-- carries the item (material.description) or the misc row already exists.
insert into public.misc_rates (tenant_id, name, rate, category)
select coalesce((select tenant_id from public.labor_rates where category = 'Outdoor Kitchen' limit 1), (select tenant_id from public.labor_rates limit 1)), v.name, v.rate, 'Utilities'
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
  ('Gas Shut-Off Valve', 89.7),
  ('PVC Conduit with Electrical', 1.92),
  ('Electric Sub-panel', 300),
  ('Electric Disconnect', 150),
  ('GFCI Protected Receptacles', 86.25),
  ('Bubble Covers for Receptacles', 19.19),
  ('Infratech W2024SS 2000W 240V Heater (Stainless)', 725.22),
  ('Infratech W39 Flush Mount Frame', 572.26),
  ('Infratech Single Duplex Switch in Surface Mount Gang Box', 206.11)
) as v(name, rate)
where not exists (select 1 from public.misc_rates m where m.name = v.name and m.category = 'Utilities')
  and not exists (select 1 from public.material mat where mat.description = v.name);
