-- Track which org chart introduced a position (when a template/wizard adds
-- positions that weren't already in the table). Existing positions stay null
-- and show under the "Main" tab in HR > Positions.
alter table public.positions
  add column if not exists source_chart_id uuid
  references public.org_charts(id) on delete set null;
