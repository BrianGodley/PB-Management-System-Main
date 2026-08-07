-- supabase-update-105.sql
-- Per-user, per-module dashboard background colors. Stored as a small jsonb map
-- on the user's dashboard_preferences row, e.g.
--   { "page": "#eff6ff", "weather": "#ecfdf5", "stat1": null, ... }
alter table dashboard_preferences
  add column if not exists module_colors jsonb;
