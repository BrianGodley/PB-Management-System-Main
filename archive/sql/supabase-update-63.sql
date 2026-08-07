-- supabase-update-63.sql
-- Secondary stat support: source_stat_id and aggregation_method on statistics

ALTER TABLE statistics
  ADD COLUMN IF NOT EXISTS source_stat_id    bigint REFERENCES statistics(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS aggregation_method text NOT NULL DEFAULT 'sum';
