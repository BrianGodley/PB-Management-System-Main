-- Add subsection column to collection_financial
-- Used to group payables_alloc rows into Prelims / Credit Cards / Credit Vendors / Standard Vendors
ALTER TABLE collection_financial
  ADD COLUMN IF NOT EXISTS subsection text;

-- Add source_payable_id to track which payable row was copied into an allocation row
ALTER TABLE collection_financial
  ADD COLUMN IF NOT EXISTS source_payable_id uuid REFERENCES collection_payables(id) ON DELETE SET NULL;
