-- supabase-update-49.sql
-- Add BT Import and GHL Import stages, reassign new_lead contacts to bt_import

-- Step 1: Drop old stage check constraint
ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_stage_check;

-- Step 2: Add updated check constraint with new stages
ALTER TABLE contacts
  ADD CONSTRAINT contacts_stage_check
  CHECK (stage IN ('new_lead','warm_lead','consultation','quoted','won','lost','nurture','bt_import','ghl_import'));

-- Step 3: Move all current new_lead contacts to bt_import
UPDATE contacts SET stage = 'bt_import' WHERE stage = 'new_lead';
