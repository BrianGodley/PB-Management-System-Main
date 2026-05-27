-- ─────────────────────────────────────────────────────────────────────────
-- QuickBooks Chart of Accounts → PBS acct_accounts
--
-- The PBS chart was incomplete. We pull QB's full chart and let it become
-- the source of truth, but ADDITIVELY: existing manual rows stay put so we
-- don't break acct_bill_lines / acct_check_lines / acct_credit_card_charge_lines
-- / acct_item_receipt_lines / acct_invoice_lines that point at them.
--
-- New columns on acct_accounts:
--   qb_list_id            — QB ListID, UNIQUE, the idempotent sync key
--   qb_full_name          — QB FullName ("Materials:Pavers"), includes parent path
--   qb_account_type       — raw QB AccountType (Bank, FixedAsset, etc.)
--   qb_edit_sequence      — change-detection token from QB
--   qb_time_modified      — QB's last-modified timestamp
--   qb_synced_at          — when we last pulled this row
--   parent_id             — self-FK for QB hierarchy (Materials → Pavers)
--   source                — 'manual' | 'qb'
--   parent_qb_list_id     — staging field; the qbwc function fills it on
--                           insert and we resolve parent_id from it in a
--                           second pass after all rows are upserted.
--
-- Mapping QB AccountType → PBS type (high-level) is done by the qbwc edge
-- function in TypeScript; here we just store both so reports can pivot
-- either way.
-- ─────────────────────────────────────────────────────────────────────────

BEGIN;

ALTER TABLE acct_accounts
  ADD COLUMN IF NOT EXISTS qb_list_id         TEXT,
  ADD COLUMN IF NOT EXISTS qb_full_name       TEXT,
  ADD COLUMN IF NOT EXISTS qb_account_type    TEXT,
  ADD COLUMN IF NOT EXISTS qb_edit_sequence   TEXT,
  ADD COLUMN IF NOT EXISTS qb_time_modified   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS qb_synced_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS parent_id          UUID REFERENCES acct_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS parent_qb_list_id  TEXT,
  ADD COLUMN IF NOT EXISTS source             TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual','qb'));

-- Idempotency: one row per QB account.
DROP INDEX  IF EXISTS acct_accounts_qb_list_id_uq;
ALTER TABLE acct_accounts DROP CONSTRAINT IF EXISTS acct_accounts_qb_list_id_uq;
ALTER TABLE acct_accounts
  ADD CONSTRAINT acct_accounts_qb_list_id_uq UNIQUE (qb_list_id);

CREATE INDEX IF NOT EXISTS acct_accounts_parent_idx
  ON acct_accounts(parent_id) WHERE parent_id IS NOT NULL;

-- ── Parent resolver ──────────────────────────────────────────────────────
-- After the qbwc function upserts the QB account rows, call this function
-- to fill parent_id from parent_qb_list_id. Doing it as a separate step
-- lets the upsert be a single batch (no ordering by depth) and then we
-- resolve the hierarchy in one set-based UPDATE.
CREATE OR REPLACE FUNCTION resolve_acct_account_parents()
RETURNS INTEGER
LANGUAGE plpgsql AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE acct_accounts c
     SET parent_id = p.id
    FROM acct_accounts p
   WHERE c.parent_qb_list_id IS NOT NULL
     AND p.qb_list_id IS NOT NULL
     AND c.parent_qb_list_id = p.qb_list_id
     AND (c.parent_id IS DISTINCT FROM p.id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

COMMIT;

NOTIFY pgrst, 'reload schema';
