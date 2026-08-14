-- ============================================================================
-- Finishes: guarantee every rate that USED to have a code fallback now exists
-- in a table (so deleting the fallbacks can't zero out an estimate). Values are
-- the old code fallbacks (FINISHES_RATES.fb). Inserts ONLY where the rate is
-- missing — never overwrites a value you've already set. Run on prod (and
-- staging) BEFORE deploying the fallback-free FinishesModule / FinishesSummary.
--
-- Labor coefficients → labor_rates (category 'Finishes'); the estimator reads
-- them via the shared catalog price map. Material $ → misc_rates (category
-- 'Finishes'), skipped when a catalog material.description already carries the
-- name (the new-model material price wins).
-- ============================================================================

-- Labor coefficients (hrs/SF, hrs/LF, hrs/ea, SF/day) → labor_rates.
insert into public.labor_rates (tenant_id, name, rate, category)
select t.tid, v.name, v.rate, 'Finishes'
from (select tenant_id tid from public.labor_rates where category = 'Finishes' limit 1) t
cross join (values
  ('Finishes Tile Flatwork Labor Rate',       0.2867),
  ('Finishes Brick Flatwork Labor Rate',      0.35),
  ('Finishes Flagstone Flatwork Labor Rate',  0.4487),
  ('Finishes Porcelain Flatwork Labor Rate',  0.267),
  ('Sand Stucco - Finishes Labor Rate',       92),
  ('Smooth Stucco - Finishes Labor Rate',     65),
  ('Ledgerstone - Finishes Labor Rate',       24),
  ('Stacked Stone - Finishes Labor Rate',     24),
  ('Tile - Finishes Labor Rate',              0.2867),
  ('Real Flagstone - Finishes Labor Rate',    0.4487),
  ('Real Stone - Finishes Labor Rate',        0.8954),
  ('Finishes Cap Flagstone Labor Rate',       0.25),
  ('Finishes Cap Precast Labor Rate',         0.2),
  ('Finishes Cap PIP Concrete Labor Rate',    0.15),
  ('Finishes Cap Bullnose Labor Rate',        0.08)
) as v(name, rate)
where not exists (
  select 1 from public.labor_rates l where l.name = v.name and l.category = 'Finishes'
);

-- Material $ (per SF / per brick / per ton / per piece / per CY) → misc_rates,
-- unless a catalog material of the same description already exists (new model).
insert into public.misc_rates (tenant_id, name, rate, category)
select t.tid, v.name, v.rate, 'Finishes'
from (select tenant_id tid from public.labor_rates where category = 'Finishes' limit 1) t
cross join (values
  ('Finishes Tile Flatwork',       6.5),
  ('Finishes Brick Flatwork',      3.0),
  ('Finishes Flagstone Flatwork',  400.0),
  ('Finishes Porcelain Flatwork',  10.0),
  ('Finishes Cap Flagstone',       500.0),
  ('Finishes Cap Precast',         50.0),
  ('Finishes Cap Bullnose Brick',  5.0),
  ('Finishes Concrete Truck',      185.0),
  ('Sand Stucco - Finishes',       0.0),
  ('Smooth Stucco - Finishes',     0.0),
  ('Ledgerstone - Finishes',       10.0),
  ('Stacked Stone - Finishes',     10.0),
  ('Tile - Finishes',              6.5),
  ('Real Flagstone - Finishes',    400.0),
  ('Real Stone - Finishes',        400.0),
  ('Finishes Stone Screws',        0.4),
  ('Finishes Tile Adhesive/Grout', 1.0)
) as v(name, rate)
where not exists (select 1 from public.misc_rates m where m.name = v.name and m.category = 'Finishes')
  and not exists (select 1 from public.material mat where mat.description = v.name);

-- Verify:
-- select name, rate from public.labor_rates where category='Finishes' order by name;
-- select name, rate from public.misc_rates  where category='Finishes' order by name;
