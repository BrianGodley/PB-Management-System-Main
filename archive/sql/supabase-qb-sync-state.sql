-- ─────────────────────────────────────────────────────────────────────────
-- QuickBooks sync watermark — incremental-pull state
--
-- Stores a per-entity timestamp (last_synced_at = the max qb_time_modified
-- we have successfully ingested for that entity). The qbwc edge function
-- reads this on authenticate() and includes a ModifiedDateRangeFilter in
-- subsequent BillQueryRq / CheckQueryRq / CreditCardChargeQueryRq /
-- ItemReceiptQueryRq calls so QuickBooks only sends back records modified
-- since our last successful pull.
--
-- Effect: first pull is full (minutes); every subsequent pull is just the
-- delta (typically seconds, often zero records). Makes Auto-Run safe to
-- leave enabled.
--
-- Updates use GREATEST() via the advance_qb_watermark() RPC so a late or
-- out-of-order batch can't regress the watermark and cause us to re-pull
-- already-synced records.
-- ─────────────────────────────────────────────────────────────────────────

BEGIN;

CREATE TABLE IF NOT EXISTS qb_sync_state (
  entity              TEXT        PRIMARY KEY,    -- 'Bill', 'Check', 'CreditCardCharge', 'ItemReceipt'
  last_synced_at      TIMESTAMPTZ,                -- max qb_time_modified we've safely ingested
  last_session_ticket TEXT,                       -- which session set this
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE qb_sync_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "qb_sync_state_all" ON qb_sync_state;
CREATE POLICY "qb_sync_state_all" ON qb_sync_state
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Safe watermark advance — only moves forward. Late or out-of-order
-- batches can never regress the watermark.
CREATE OR REPLACE FUNCTION advance_qb_watermark(
  p_entity         TEXT,
  p_modified_at    TIMESTAMPTZ,
  p_session_ticket TEXT
) RETURNS TIMESTAMPTZ
LANGUAGE plpgsql AS $advance$
DECLARE
  v_current TIMESTAMPTZ;
BEGIN
  IF p_modified_at IS NULL THEN
    -- Nothing to do — caller couldn't read a TimeModified.
    SELECT last_synced_at INTO v_current FROM qb_sync_state WHERE entity = p_entity;
    RETURN v_current;
  END IF;

  INSERT INTO qb_sync_state (entity, last_synced_at, last_session_ticket, updated_at)
  VALUES (p_entity, p_modified_at, p_session_ticket, NOW())
  ON CONFLICT (entity) DO UPDATE
     SET last_synced_at      = GREATEST(qb_sync_state.last_synced_at, EXCLUDED.last_synced_at),
         last_session_ticket = EXCLUDED.last_session_ticket,
         updated_at          = NOW()
   RETURNING last_synced_at INTO v_current;

  RETURN v_current;
END;
$advance$;

-- Quick view of current state — for diagnostics.
CREATE OR REPLACE VIEW v_qb_sync_state AS
SELECT
  entity,
  last_synced_at,
  AGE(NOW(), last_synced_at) AS time_since_last_sync,
  last_session_ticket,
  updated_at
FROM qb_sync_state
ORDER BY entity;

COMMIT;

NOTIFY pgrst, 'reload schema';


-- ─────────────────────────────────────────────────────────────────────────
-- Data API grants (Supabase change effective 2026-10-30 — new tables in
-- public are not exposed via PostgREST / supabase-js by default; this
-- block makes them reachable. RLS policies (above) still control rows.
-- ─────────────────────────────────────────────────────────────────────────
GRANT ALL ON public.qb_sync_state TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.qb_sync_state TO authenticated;
