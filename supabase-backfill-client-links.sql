-- ============================================================
-- Client-link backfill + site-access columns
-- 1) Adds gate_code / has_dog / access_notes to jobs
-- 2) Back-fills jobs.client_id by case-insensitive name match (skips ambiguous)
-- 3) Back-fills contacts.client_id by case-insensitive name match (skips ambiguous)
-- ============================================================

BEGIN;

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS gate_code     TEXT,
  ADD COLUMN IF NOT EXISTS has_dog       BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS access_notes  TEXT;

WITH job_unique AS (
  SELECT j.id AS job_id, sub.client_id
  FROM jobs j
  JOIN LATERAL (
    SELECT c.id AS client_id
    FROM clients c
    WHERE LOWER(TRIM(c.name)) = LOWER(TRIM(j.client_name))
    LIMIT 2
  ) sub ON TRUE
  WHERE j.client_id IS NULL
    AND TRIM(COALESCE(j.client_name,'')) <> ''
  GROUP BY j.id, sub.client_id
  HAVING COUNT(*) = 1
)
UPDATE jobs j
SET client_id = u.client_id
FROM job_unique u
WHERE j.id = u.job_id
  AND j.client_id IS NULL;

WITH contact_unique AS (
  SELECT cn.id AS contact_id, sub.client_id
  FROM contacts cn
  JOIN LATERAL (
    SELECT c.id AS client_id
    FROM clients c
    WHERE LOWER(TRIM(c.name)) = LOWER(TRIM(
      COALESCE(cn.first_name,'') || ' ' || COALESCE(cn.last_name,'')
    ))
    LIMIT 2
  ) sub ON TRUE
  WHERE cn.client_id IS NULL
    AND TRIM(COALESCE(cn.first_name,'') || COALESCE(cn.last_name,'')) <> ''
  GROUP BY cn.id, sub.client_id
  HAVING COUNT(*) = 1
)
UPDATE contacts cn
SET client_id = u.client_id
FROM contact_unique u
WHERE cn.id = u.contact_id
  AND cn.client_id IS NULL;

SELECT 'jobs with client_id'    AS metric, COUNT(*) AS n FROM jobs     WHERE client_id IS NOT NULL
UNION ALL SELECT 'jobs without client_id',         COUNT(*) FROM jobs     WHERE client_id IS NULL
UNION ALL SELECT 'contacts with client_id',        COUNT(*) FROM contacts WHERE client_id IS NOT NULL
UNION ALL SELECT 'contacts without client_id',     COUNT(*) FROM contacts WHERE client_id IS NULL;

COMMIT;
