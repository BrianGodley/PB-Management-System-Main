-- supabase-update-28.sql
-- Add show_values column to statistics table

alter table statistics
  add column if not exists show_values boolean not null default false;
