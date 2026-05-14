-- ============================================================
-- v2 Change Order enrichment fields on bids
-- ============================================================
ALTER TABLE bids
  ADD COLUMN IF NOT EXISTS expires_at              TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS viewed_by_owner_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS bt_attachment_count     INT,
  ADD COLUMN IF NOT EXISTS bt_attachment_last_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS bt_attached_by_names    TEXT,
  ADD COLUMN IF NOT EXISTS bt_created_by_name      TEXT;
