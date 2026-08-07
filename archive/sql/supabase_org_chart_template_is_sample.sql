-- Distinguish system-provided "sample" templates from user-"created" ones.
alter table public.org_chart_templates
  add column if not exists is_sample boolean not null default false;
