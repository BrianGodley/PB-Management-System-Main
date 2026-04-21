-- Fix incorrect week ending date
-- The week showing "starting Apr 18" (week_ending Apr 24) should be week_ending Apr 25 (starting Apr 19, Sunday)
UPDATE collection_weeks
SET week_ending = '2026-04-25'
WHERE week_ending = '2026-04-24';
