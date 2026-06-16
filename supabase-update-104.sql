-- supabase-update-104.sql
-- Per-user dashboard background choice (synced across devices). Stored on the
-- existing dashboard_preferences row so it follows the user everywhere.
alter table dashboard_preferences
  add column if not exists background text;
