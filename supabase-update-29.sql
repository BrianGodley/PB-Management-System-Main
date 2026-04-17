-- supabase-update-29.sql
-- Add estimate linkage and projects list to bids table

alter table bids
  add column if not exists estimate_id uuid references estimates(id) on delete set null,
  add column if not exists projects    text[] default '{}';
