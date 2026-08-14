-- ============================================================================
-- Walls: guarantee every rate that USED to have a code fallback now exists in a
-- table, so deleting the module's hardcoded fallbacks can't zero out an estimate.
-- Values are the OLD code fallbacks. INSERT-ONLY where the rate is missing —
-- never overwrites a value you've already set. Idempotent; run on prod + staging
-- BEFORE deploying the fallback-free Walls module. Mirrors
-- supabase-drainage-fallbacks-seed.sql.
-- ============================================================================

-- Labor coefficients -> labor_rates (category 'Walls').
insert into public.labor_rates (tenant_id, name, rate, category)
select coalesce((select tenant_id from public.labor_rates where category = 'Walls' limit 1), (select tenant_id from public.labor_rates limit 1)), v.name, v.rate, 'Walls'
from (values
  ('Wall Dig Footing Labor Rate', 4.0),
  ('Wall Set Rebar Labor Rate', 35.0),
  ('Wall Set Block Labor Rate', 10.4),
  ('Wall Hand Grout Labor Rate', 5.5),
  ('Wall Pump Grout Labor Rate', 81.0),
  ('Wall Setup Clean Labor Rate', 30.0),
  ('Sand Stucco - Wall Labor Rate', 92),
  ('Smooth Stucco - Wall Labor Rate', 65),
  ('Ledgerstone - Wall Labor Rate', 24),
  ('Stacked Stone - Wall Labor Rate', 24),
  ('Tile - Wall Labor Rate', 0.2867),
  ('Real Flagstone - Wall Labor Rate', 0.4487),
  ('Real Stone - Wall Labor Rate', 0.8954),
  ('Wall Cap Flagstone Labor', 0.25),
  ('Wall Cap Precast Labor', 0.2),
  ('Wall Cap PIP Concrete Labor', 0.15),
  ('Wall Cap Bullnose Labor', 0.08),
  ('Wall WP Install Labor', 200),
  ('Wall WP Primer + Membrane Labor', 100),
  ('Wall WP 2 Coats Roll On Labor', 125),
  ('Wall WP Thoroseal Labor', 75),
  ('Wall WP Dimple Labor', 50),
  ('Wall Brick Lay Labor', 1.75),
  ('Wall Timber Qty per LF', 0.2917),
  ('Wall Timber Qty per Added Course', 0.55),
  ('Wall Timber LF Labor', 0.4417),
  ('Wall Timber Added Course Labor', 0.8),
  ('Wall Timber Steel Post Labor', 0.4667),
  ('Wall Block Order Waste', 1.1),
  ('Wall Footing Rebar Waste', 1.1),
  ('Wall Footing Pour Labor Rate', 0.2037),
  ('Wall Hand Pour Footing Labor Rate', 0.2037),
  ('Wall Pump Footing Labor Rate', 0.2037),
  ('Wall Modular Install Labor Rate', 10.4),
  ('Wall Footing Dig+Haul Labor Rate', 8),
  ('Wall Footing Dig+Haul Excavator Labor Rate', 25),
  ('Wall Footing Soil Swell', 1.2),
  ('Wall Footing Soil Container CY', 10),
  ('Wall Footing Soil Tons per CY', 1.5),
  ('Wall Curve Labor Factor', 0.5),
  ('Wall PIP Stem LF Labor', 1.0833),
  ('Wall PIP Stem Added Course Labor', 1.6167),
  ('Wall PIP Stem CY per LF', 0.2833),
  ('Wall PIP Stem CY per LF per Course', 0.3667),
  ('Wall Ledgerstone Waste', 1.1),
  ('Wall Ledgerstone Setting SF per Unit', 5),
  ('Wall Stacked Stone Waste', 1.1),
  ('Wall Stacked Stone Setting SF per Unit', 5),
  ('Wall Real Flagstone SF per Ton', 80),
  ('Wall Real Stone SF per Ton', 70),
  ('Wall Hand Compaction Multiplier', 3)
) as v(name, rate)
where not exists (
  select 1 from public.labor_rates l where l.name = v.name and l.category = 'Walls'
);

-- Material / misc -> misc_rates (category 'Walls'); skipped if the catalog already
-- carries the item (material.description) or the misc row already exists.
insert into public.misc_rates (tenant_id, name, rate, category)
select coalesce((select tenant_id from public.labor_rates where category = 'Walls' limit 1), (select tenant_id from public.labor_rates limit 1)), v.name, v.rate, 'Walls'
from (values
  ('Wall Timber Steel Post', 100),
  ('Wall Footing Soil Container Price', 770),
  ('Wall Ledgerstone Setting Unit Cost', 2),
  ('Wall Ledgerstone Sub Extra per SF', 0.4),
  ('Wall Stacked Stone Setting Unit Cost', 2),
  ('Wall Stacked Stone Sub Extra per SF', 0.4),
  ('Wall Tile Extra per SF', 1),
  ('Wall Real Flagstone Extra per SF', 1.5),
  ('Wall Real Stone Extra per SF', 2)
) as v(name, rate)
where not exists (select 1 from public.misc_rates m where m.name = v.name and m.category = 'Walls')
  and not exists (select 1 from public.material mat where mat.description = v.name);

-- ---------------------------------------------------------------------------
-- CATALOG MATERIAL ITEMS (NOT auto-seeded here — they resolve from the catalog
-- sub-categories the module actually reads, not from misc_rates. Listed with
-- their OLD hardcoded fallback so you can confirm/seed them in the catalog if a
-- price is missing. Removing the code fallbacks makes an unpriced one read $0.)
--
-- CMU Block prices  ->  catalog name 'Wall Block <name>' (sub-category 'Wall Block'):
--   '8x8x16 (GREY)' 2.59, '8x8x16 SPLITFACE' 5.19, '8x8x16 (COLOR)' 6.19,
--   '8x6x16 SLUMP (GREY)' 4.09, '8x6x16 SLUMP (COLOR)' 4.59,
--   '12x8x16 (GREY)' 5.39, '12x8x16 SPLITFACE' 7.59, '12x8x16 (COLOR)' 6.39,
--   '12x6x16 SLUMP (COLOR)' 8.6, '12x6x16 SLUMP (GREY)' 7.89,
--   '6x8x16 (GREY)' 2.13, '6x8x16 SPLITFACE' 4.59, '6x8x16 (COLOR)' 2.59,
--   '6x6x16 SLUMP (COLOR)' 3.0, '6x6x16 SLUMP (GREY)' 3.01
-- Modular block fallback  ->  'Modular Wall' sub-category, old fb 3.5 (now $0 if unpriced)
-- Timber wood fallback    ->  'Wood' sub-category, old fb 50 (now $0 if unpriced)
-- Wall Finishes (Wall Finish subcat):  Sand Stucco 0, Smooth Stucco 0,
--   Ledgerstone 10, Stacked Stone 10, Tile 6.5, Real Flagstone 400, Real Stone 400
-- Wall Caps (Wall Cap subcat):  Wall Cap Flagstone 500, Wall Cap Precast 50,
--   Wall Cap Bullnose Brick 5
-- Waterproofing (Waterproofing subcat):  Wall WP Primer Membrane 1.8,
--   Wall WP 3 Coat Roll On 1.2, Wall WP Thoroseal Roll On 1.5, Wall WP Dimple Membrane 2.1
--
-- SHARED rates already seeded by their own module seeds (no dup here):
--   Basic Materials: Concrete - Hand Mix 92, Concrete - Ready Mix (Truck) 185,
--     Grout Pump - Setup 402.5, Grout Pump - Per CY 9.2, Rebar #3..#8, Rebar 1.388
--   Demo (category 'Demo'): Demo containers/swell + 'Demo SF to Tons Denom' 200
--     + shared Hand/Mini/Skid dirt/grade-fill/JJ coefficients
--   Drainage (category 'Drainage'): per-wall French-drain rates — see
--     supabase-drainage-fallbacks-seed.sql
-- ---------------------------------------------------------------------------
