-- Add 'type' column to subs_vendors to distinguish subcontractors from vendors
ALTER TABLE subs_vendors
  ADD COLUMN IF NOT EXISTS type text DEFAULT 'sub' CHECK (type IN ('sub', 'vendor'));

-- Index for filtering by type
CREATE INDEX IF NOT EXISTS subs_vendors_type_idx ON subs_vendors(type);

-- Backfill existing rows as 'sub' (already handled by DEFAULT, but explicit for clarity)
UPDATE subs_vendors SET type = 'sub' WHERE type IS NULL;
