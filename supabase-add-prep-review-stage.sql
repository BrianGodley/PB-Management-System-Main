-- Add "Prep Review" job stage at the end of the existing stages.
-- Safe to re-run: uses ON CONFLICT DO NOTHING when name is unique,
-- otherwise the WHERE NOT EXISTS guard prevents duplicates.

INSERT INTO job_stages (name, sort_order)
SELECT 'Prep Review', COALESCE(MAX(sort_order), 0) + 1
FROM job_stages
WHERE NOT EXISTS (
  SELECT 1 FROM job_stages WHERE name = 'Prep Review'
);
