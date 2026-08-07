-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-bid-doc-html.sql
-- Add columns to bids for storing an editable bid document.
--
-- bid_doc_html        — the HTML content the user edited and saved. NULL means
--                       no edited version yet; the modal generates from estimate.
-- bid_doc_updated_at  — timestamp of last save, useful for "your saved version
--                       is older than the estimate" UX later.
--
-- Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE bids
  ADD COLUMN IF NOT EXISTS bid_doc_html       TEXT,
  ADD COLUMN IF NOT EXISTS bid_doc_updated_at TIMESTAMPTZ;
