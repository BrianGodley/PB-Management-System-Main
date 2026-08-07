-- Make a chart's own positions list delete WITH the chart, instead of being
-- orphaned into the Main list. Positions tied to a chart (source_chart_id set)
-- are removed when that chart is deleted; Main positions (source_chart_id null)
-- are never affected.
alter table public.positions
  drop constraint if exists positions_source_chart_id_fkey;

alter table public.positions
  add constraint positions_source_chart_id_fkey
  foreign key (source_chart_id)
  references public.org_charts(id)
  on delete cascade;
