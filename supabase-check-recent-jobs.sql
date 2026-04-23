-- Show all jobs created in the last 24 hours with their key fields
SELECT id, name, client_name, status, sold_date, total_price, created_at
FROM jobs
ORDER BY created_at DESC NULLS LAST
LIMIT 10;
