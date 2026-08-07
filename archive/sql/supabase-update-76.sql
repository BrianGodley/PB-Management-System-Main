-- supabase-update-76.sql
-- Convert existing manually-entered "Solvency" stat to an auto-internal push stat.
-- All existing statistic_values rows are preserved (history is kept intact).

UPDATE statistics
SET
  stat_category = 'auto_internal',
  data_source   = '{"key":"finance_solvency","category":"Finance","source_type":"push","stat_type":"currency","tracking":"weekly","label":"Financial Planning — Total Solvency"}',
  tracking      = 'weekly'
WHERE LOWER(TRIM(name)) = 'solvency'
  AND stat_category NOT IN ('auto_internal', 'equation', 'overlay', 'target', 'secondary');
