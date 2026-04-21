-- Add subsection column to collection_financial
-- Used to group payables_alloc rows into Prelims / Credit Cards / Credit Vendors / Standard Vendors
ALTER TABLE collection_financial
  ADD COLUMN IF NOT EXISTS subsection text;
