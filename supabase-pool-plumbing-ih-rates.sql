-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-pool-plumbing-ih-rates.sql
--
-- Master rates for the Pool module's In-House Plumbing section:
--   labor_rates    'Pool Plumbing - Base Hours' (category 'Pool') → default hrs
--   material_rates 'Pool Plumbing - Materials'   (category 'Pool') → default $
--
-- OPTIONAL: the code carries fallback defaults (16 hrs / $350) and the section's
-- RateEditPopover inserts these rows on the first Edit-Rates save, so a DB
-- missing them still works. Running this just pre-seeds the rows so they show
-- in Master Rates and persist edits from the start.
--
-- Idempotent (ON CONFLICT DO NOTHING) and tenant-safe: each block cross-joins
-- the distinct tenant_ids already present, so it works on both staging and prod
-- without editing. Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── labor_rates : In-House pool-plumbing base labor hours ────────────────────
INSERT INTO public.labor_rates (name, rate, unit, category, notes, tenant_id)
SELECT v.name, v.rate, v.unit, 'Pool', v.notes, t.tenant_id
FROM (VALUES
  ('Pool Plumbing - Base Hours', 16, 'hrs', 'In-House pool plumbing base labor hours (coefficient)')
) AS v(name, rate, unit, notes)
CROSS JOIN (SELECT DISTINCT tenant_id FROM public.labor_rates) AS t
ON CONFLICT DO NOTHING;

-- ── material_rates : In-House pool-plumbing materials $ ──────────────────────
INSERT INTO public.material_rates (name, unit_cost, unit, category, notes, tenant_id)
SELECT v.name, v.unit_cost, v.unit, 'Pool', v.notes, t.tenant_id
FROM (VALUES
  ('Pool Plumbing - Materials', 350, 'ea', 'In-House pool plumbing materials $ default')
) AS v(name, unit_cost, unit, notes)
CROSS JOIN (SELECT DISTINCT tenant_id FROM public.material_rates) AS t
ON CONFLICT DO NOTHING;
