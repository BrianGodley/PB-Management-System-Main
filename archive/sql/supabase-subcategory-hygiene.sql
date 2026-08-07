-- ─────────────────────────────────────────────────────────────────────────────
-- Schema hygiene: unify the two parallel subcategory columns on material_rates.
--
-- material_rates has BOTH `subcategory` (paver + lighting catalogs read this)
-- and `sub_category` (selections + catalog importer + price sheets read this).
-- They mean the same thing. This backfill syncs them so every reader agrees.
-- NON-DESTRUCTIVE — nothing is dropped. Run on BOTH DBs (staging + prod).
--
-- Once every reader is moved onto a single column (planned), drop the other.
-- ─────────────────────────────────────────────────────────────────────────────
update public.material_rates
   set sub_category = subcategory
 where sub_category is null
   and subcategory is not null;

update public.material_rates
   set subcategory = sub_category
 where subcategory is null
   and sub_category is not null;

-- Sanity check — rows where the two still disagree (should be 0 after the run;
-- any results are genuine conflicts to resolve by hand):
-- select id, name, category, subcategory, sub_category
--   from public.material_rates
--  where coalesce(subcategory,'') <> coalesce(sub_category,'');
