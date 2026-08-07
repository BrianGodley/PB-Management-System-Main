-- DIAGNOSTIC (read-only). Shows the Construction category, its subcategories,
-- and how many SAMPLE templates each one has. Run this and check:
--   • Is the category name exactly "Construction"? (row A)
--   • Do all 55 subcategories exist?           (row count in B)
--   • Do they have samples (count > 0)?          (B)

-- (A) Category names (confirm the exact spelling used for construction):
select id, name from public.org_chart_template_categories order by name;

-- (B) Construction subcategories with their sample-template counts:
select s.name as subcategory,
       count(t.id) filter (where t.is_sample) as sample_charts
from public.org_chart_template_subcategories s
join public.org_chart_template_categories c on c.id = s.category_id
left join public.org_chart_templates t on t.subcategory_id = s.id
where c.name = 'Construction'
group by s.name
order by s.name;
