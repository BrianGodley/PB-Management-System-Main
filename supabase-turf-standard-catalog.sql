-- ─────────────────────────────────────────────────────────────────────────────
-- Single Resolution Path — TURF PILOT: consolidate turf into ONE standard catalog
--
-- Today every turf row is stamped with one vendor (432cbb99…) and doubles as the
-- default price. This makes those rows the STANDARD/Unspecified catalog (one
-- product id each, at today's prices — the edited 3.25 on Socal is preserved),
-- tags the marker, and cleans the brand names so the picker shows tidy labels.
-- A vendor that later quotes differently becomes a price tag on the SAME id, not
-- a new row.
--
-- Pairs with the id-based ArtificialTurfModule change — run this, then deploy.
-- Run once on prod. Idempotent.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Drop the single-vendor stamp on all turf rows → they become the standard.
UPDATE material_rates
   SET vendor_id = NULL
 WHERE category = 'Artificial Turf'
   AND vendor_id = '432cbb99-dfd3-4f9a-a818-93a6ad0f3427';

-- 2) Brand rows: tag the marker + drop the 'Turf - ' name prefix. The clean name
--    equals the old stored selection key, so estimates saved before the switch
--    still resolve (catalogItemFor matches by label), while new ones store the id.
UPDATE material_rates
   SET sub_category = 'Turf Material',
       name = regexp_replace(name, '^Turf - ', '')
 WHERE category = 'Artificial Turf'
   AND name IN (
     'Turf - Autumn Grass 75','Turf - Bel Air SH 92/66','Turf - Bel Air SH Light 50',
     'Turf - Bel Air Supreme 90','Turf - Golf Pro SH 47','Turf - Performance Play 63',
     'Turf - Pet Turf Pro 85','Turf - Socal Blen Supreme 80','Turf - Venice SH Light 50',
     'Turf - Verdant Supreme 94'
   );

-- 3) Base materials: tag their marker (names kept — the base picker is unchanged).
UPDATE material_rates
   SET sub_category = 'Turf Base'
 WHERE category = 'Artificial Turf'
   AND name IN ('Turf - Gravel Base','Turf - DG Base','Turf - Weed Barrier Fabric');

-- 4) Check — the 10 brand rows should now be Unspecified + tagged + clean-named.
-- SELECT name, vendor_id, unit_cost, sub_category
--   FROM material_rates
--  WHERE category = 'Artificial Turf' AND sub_category = 'Turf Material'
--  ORDER BY name;
