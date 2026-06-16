-- supabase-update-106.sql
-- Per-user, per-module page backgrounds. A map of route key → background id,
-- e.g. { "/": "waves-blue", "/edocuments": "green", "/jobs": "mesh" }.
-- The app shell shows the matching background on each module's pages.
alter table dashboard_preferences
  add column if not exists module_backgrounds jsonb;
