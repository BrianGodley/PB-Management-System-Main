-- ─────────────────────────────────────────────────────────────────────────────
-- Single Resolution Path — PHASE 2: vendor_product_price (canonical price source)
--
-- The price ledger already exists (material_price_history) and the estimator
-- falls back to material_rates.unit_cost when a row has no ledger period. This
-- phase makes the ledger COMPLETE (an open period for every priced row) and
-- exposes it under the target-model name, so a later step can point the resolver
-- solely at it. ADDITIVE — no estimator behavior change; open price == unit_cost.
--
-- Run STAGING first. Run the PARITY checks in section 4 and confirm ZERO
-- mismatches before Phase 2b (the resolver switch). Then PROD.
-- Idempotent.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Completeness backfill — give every priced material_rates row an OPEN ledger
--    period equal to its current unit_cost, if it doesn't already have one.
--    (The Phase-4 sync trigger only writes on price *changes*, so rows seeded
--    since the original backfill can be missing an open period.)
INSERT INTO public.material_price_history
  (tenant_id, material_rate_id, vendor_id, unit_cost, effective_start, source)
SELECT m.tenant_id, m.id, m.vendor_id, m.unit_cost, current_date, 'backfill'
  FROM public.material_rates m
 WHERE m.unit_cost IS NOT NULL
   AND NOT EXISTS (
     SELECT 1 FROM public.material_price_history h
      WHERE h.material_rate_id = m.id
        AND h.effective_end IS NULL
   );

-- 2) vendor_product_price — the canonical "current price per product+vendor".
--    A view over the open ledger periods; security_invoker keeps tenant RLS.
CREATE OR REPLACE VIEW public.vendor_product_price
  WITH (security_invoker = true) AS
  SELECT id,
         tenant_id,
         material_rate_id AS product_id,
         vendor_id,
         unit_cost,
         effective_start,
         source
    FROM public.material_price_history
   WHERE effective_end IS NULL;

GRANT SELECT ON public.vendor_product_price TO authenticated;

-- 3) Done. The ledger is now the single, complete current-price source; the
--    resolver switch is Phase 2b (code) after the parity checks below pass.

-- ─────────────────────────────────────────────────────────────────────────────
-- 4) PARITY CHECKS — run these after sections 1–2. All must return 0 rows / 0.
-- ─────────────────────────────────────────────────────────────────────────────

-- (a) Any priced row still missing an open ledger period → must be 0.
-- SELECT count(*) AS missing_open_period
--   FROM public.material_rates m
--  WHERE m.unit_cost IS NOT NULL
--    AND NOT EXISTS (SELECT 1 FROM public.material_price_history h
--                     WHERE h.material_rate_id = m.id AND h.effective_end IS NULL);

-- (b) Any row whose open ledger price != its unit_cost → must be 0 rows.
-- SELECT m.id, m.name, m.category, m.unit_cost, v.unit_cost AS ledger_cost
--   FROM public.material_rates m
--   JOIN public.vendor_product_price v ON v.product_id = m.id
--  WHERE m.unit_cost IS DISTINCT FROM v.unit_cost;

-- (c) Any material with MORE THAN ONE open period (should have been deduped) → 0.
-- SELECT material_rate_id, count(*)
--   FROM public.material_price_history
--  WHERE effective_end IS NULL
--  GROUP BY material_rate_id
-- HAVING count(*) > 1;
