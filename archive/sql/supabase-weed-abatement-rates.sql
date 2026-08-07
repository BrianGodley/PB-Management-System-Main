-- ═════════════════════════════════════════════════════════════════════════════
-- WEED ABATEMENT — material_rates : Subcontractor $/SF default
--
-- Seeds the master-rate row the Weed Abatement module's Sub tab reads for its
-- default $/SF (used only when the estimator leaves the rate field blank).
--
-- OPTIONAL: you do NOT have to run this. The RateEditPopover ✎ editor next to
-- "Subcontractor Rate ($ / SF)" inserts this exact row on its first save if it
-- is absent. This seed just pre-populates a sensible default so the module has
-- one before anyone opens the editor.
--
-- Idempotent: scoped per tenant via CROSS JOIN over DISTINCT tenant_id and
-- guarded by ON CONFLICT DO NOTHING (unique (tenant_id, name, category)), so it
-- is safe to re-run.
-- ═════════════════════════════════════════════════════════════════════════════
INSERT INTO public.material_rates (name, unit_cost, category, notes, tenant_id)
SELECT v.name, v.unit_cost, 'Weed Abatement', v.notes, t.tenant_id
FROM (VALUES
  ('Weed Abatement - Sub $/SF', 0.15, 'Subcontractor weed abatement price per SF - default, edit per market')
) AS v(name, unit_cost, notes)
CROSS JOIN (SELECT DISTINCT tenant_id FROM public.material_rates) AS t
ON CONFLICT DO NOTHING;
