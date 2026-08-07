-- ─────────────────────────────────────────────────────────────────────────
-- qb-material-costs PATCH 2 — performance fix
--
-- Symptom: first live QB pull got stuck at 1% for over an hour. Cause:
-- the BEFORE INSERT/UPDATE trigger on each *_lines table called
-- match_qb_customer_to_job() per row, which did a full-scan similarity
-- computation against every PBS job. With ~2k jobs and tens of thousands
-- of incoming lines, each 500-row upsert chunk did millions of similarity
-- ops and exceeded the Supabase edge-function timeout, causing QBWC to
-- retry the same batch forever.
--
-- Fix, in three parts:
--   1. Drop the per-row triggers — bulk inserts now run at native speed.
--   2. Rewrite match_qb_customer_to_job() to use the GIN trigram index
--      via the % operator. This pre-filters candidates so similarity()
--      only scores the small matched set, not the whole jobs table.
--   3. Add link_qb_lines_to_jobs() — a callable function that does
--      batch matching in one pass over each *_lines table. Run after
--      each QB pull (or on a schedule).
-- ─────────────────────────────────────────────────────────────────────────

BEGIN;

-- 1) Drop the per-row triggers.
DROP TRIGGER IF EXISTS acct_bill_lines_auto_link  ON acct_bill_lines;
DROP TRIGGER IF EXISTS acct_check_lines_auto_link ON acct_check_lines;
DROP TRIGGER IF EXISTS acct_cc_lines_auto_link    ON acct_credit_card_charge_lines;
DROP TRIGGER IF EXISTS acct_ir_lines_auto_link    ON acct_item_receipt_lines;

-- 2) Faster matcher — uses GIN trigram index via the % operator.
--    Uses named dollar-quote tags ($matcher$ / $linker$) to avoid editor
--    parsers losing the $$ boundary when multiple function bodies are
--    pasted in one statement.
CREATE OR REPLACE FUNCTION match_qb_customer_to_job(qb_name TEXT)
RETURNS UUID
LANGUAGE plpgsql STABLE AS $matcher$
DECLARE
  v_id        UUID;
  v_root      TEXT := split_part(qb_name, ':', 1);
  v_sub       TEXT := NULLIF(split_part(qb_name, ':', 2), '');
  SIM_THRESH  CONSTANT FLOAT := 0.55;
BEGIN
  IF qb_name IS NULL OR length(trim(qb_name)) = 0 THEN
    RETURN NULL;
  END IF;

  -- Exact manual override wins.
  SELECT id INTO v_id FROM jobs
   WHERE qb_customer_full_name = qb_name
   LIMIT 1;
  IF FOUND THEN RETURN v_id; END IF;

  -- Set per-statement trigram threshold so % considers anything above
  -- 0.45 a candidate; we still re-filter at 0.55 below.
  PERFORM set_limit(0.45);

  SELECT id INTO v_id FROM (
    SELECT j.id,
           GREATEST(
             similarity(j.client_name, v_root),
             similarity(j.client_name, coalesce(v_sub, v_root)),
             similarity(coalesce(j.job_address,''), coalesce(v_sub, v_root))
           ) AS sim
    FROM jobs j
    WHERE j.client_name % v_root
       OR j.client_name % coalesce(v_sub, v_root)
       OR j.job_address  % coalesce(v_sub, v_root)
    ORDER BY sim DESC
    LIMIT 5
  ) best
  WHERE sim > SIM_THRESH
  LIMIT 1;

  RETURN v_id;
END;
$matcher$;

-- 3) Batch linker — fills job_id where it's null and we have a customer
--    name. Run after each pull (or on a schedule).
CREATE OR REPLACE FUNCTION link_qb_lines_to_jobs()
RETURNS TABLE(tbl TEXT, matched INT) LANGUAGE plpgsql AS $linker$
DECLARE n INT;
BEGIN
  UPDATE acct_bill_lines l
     SET job_id = match_qb_customer_to_job(l.qb_customer_full_name)
   WHERE l.job_id IS NULL AND l.qb_customer_full_name IS NOT NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  tbl := 'acct_bill_lines';            matched := n; RETURN NEXT;

  UPDATE acct_check_lines l
     SET job_id = match_qb_customer_to_job(l.qb_customer_full_name)
   WHERE l.job_id IS NULL AND l.qb_customer_full_name IS NOT NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  tbl := 'acct_check_lines';           matched := n; RETURN NEXT;

  UPDATE acct_credit_card_charge_lines l
     SET job_id = match_qb_customer_to_job(l.qb_customer_full_name)
   WHERE l.job_id IS NULL AND l.qb_customer_full_name IS NOT NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  tbl := 'acct_credit_card_charge_lines'; matched := n; RETURN NEXT;

  UPDATE acct_item_receipt_lines l
     SET job_id = match_qb_customer_to_job(l.qb_customer_full_name)
   WHERE l.job_id IS NULL AND l.qb_customer_full_name IS NOT NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  tbl := 'acct_item_receipt_lines';    matched := n; RETURN NEXT;
END;
$linker$;

-- 4) Mark any stuck active session as errored so QBWC starts fresh next
--    time. Safe to run repeatedly.
UPDATE qb_session
   SET status = 'error',
       last_error = coalesce(last_error,'') || ' [patch-2: aborted slow trigger run]',
       updated_at = now()
 WHERE status = 'active';

COMMIT;

NOTIFY pgrst, 'reload schema';
