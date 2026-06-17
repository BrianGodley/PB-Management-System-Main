-- supabase-edoc-workflows-type.sql
-- Add a workflow Type/category (Document, Decision, Installation, Maintenance,
-- Pilot, Sales, Finance, Other). Run once in the Supabase SQL editor.

alter table edoc_workflows add column if not exists type text;
