-- Add a description to org-chart templates.
alter table public.org_chart_templates
  add column if not exists description text;
