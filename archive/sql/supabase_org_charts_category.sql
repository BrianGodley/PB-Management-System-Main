-- Classify org charts by industry category / sub-sector (same lists used for
-- templates). Optional fields, set at creation or via "Recategorize".
alter table public.org_charts
  add column if not exists category_id bigint
  references public.org_chart_template_categories(id) on delete set null;

alter table public.org_charts
  add column if not exists subcategory_id bigint
  references public.org_chart_template_subcategories(id) on delete set null;
