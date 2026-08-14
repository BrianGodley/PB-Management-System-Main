-- ============================================================================
-- Lighting: guarantee the material-markup rate that USED to have a code
-- fallback (MATERIAL_MARKUP_FB = 0.15 = 15%) now exists in a table, so deleting
-- the fallback can't silently drop the markup. Inserts ONLY where missing —
-- never overwrites. Run on prod (and staging) BEFORE deploying the
-- fallback-free LightingModule / LightingSummary.
--
-- The module reads this coefficient from misc_rates (category 'Lighting', name
-- 'Lighting - Material Markup'), stored as a fraction. Fixture / transformer /
-- wire prices already live in the catalog (material + material_price), so no
-- material rows are seeded here.
-- ============================================================================

insert into public.misc_rates (tenant_id, name, rate, category)
select t.tid, v.name, v.rate, 'Lighting'
from (select tenant_id tid from public.labor_rates where category = 'Lighting' limit 1) t
cross join (values
  ('Lighting - Material Markup', 0.15)
) as v(name, rate)
where not exists (select 1 from public.misc_rates m where m.name = v.name and m.category = 'Lighting')
  and not exists (select 1 from public.material mat where mat.description = v.name);

-- Verify:
-- select name, rate from public.misc_rates where category='Lighting' and name='Lighting - Material Markup';
