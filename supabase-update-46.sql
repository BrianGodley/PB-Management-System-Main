-- supabase-update-46.sql
-- Drop the name column from master_equipment (manufacturer + model are the correct fields)

ALTER TABLE master_equipment
  DROP COLUMN IF EXISTS name;
