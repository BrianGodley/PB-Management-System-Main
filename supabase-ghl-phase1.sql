-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-ghl-phase1.sql
--
-- GoHighLevel integration — Phase 1: schema only.
--
-- Creates:
--   • ghl_connections      — single shared token + location id for the company
--   • ghl_sync_state       — per-object high-water-mark (inbound + outbound)
--   • ghl_sync_log         — append-only run log for debugging
--   • ghl_opportunities    — local mirror of GHL pipeline opportunities
--                            (we don't force this into bids; opportunities
--                            are contact-centric in GHL while bids are
--                            estimate-centric in PBS, so we keep them
--                            distinct and decide later whether to promote
--                            won opportunities into bids)
--
-- Adds linkage columns:
--   • contacts.ghl_contact_id
--   • contacts.ghl_synced_at
--   • schedule_items.ghl_appointment_id
--   • schedule_items.ghl_calendar_id
--   • contact_communications.ghl_note_id
--
-- Notes:
--   • Single-tenant: ghl_connections is intended to hold exactly one row.
--     A unique index on a constant column enforces that.
--   • Tokens are stored in plain text in the table. Supabase encrypts at
--     rest, and Postgres-level RLS limits read access to admins. If you
--     later move to Vault, swap the column for a vault secret reference.
--   • Safe to re-run — uses IF NOT EXISTS / CREATE OR REPLACE patterns.
-- ─────────────────────────────────────────────────────────────────────────────


-- ── 1. Linkage columns on existing tables ───────────────────────────────────
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS ghl_contact_id  TEXT,
  ADD COLUMN IF NOT EXISTS ghl_synced_at   TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS contacts_ghl_contact_id_key
  ON public.contacts (ghl_contact_id)
  WHERE ghl_contact_id IS NOT NULL;

ALTER TABLE public.schedule_items
  ADD COLUMN IF NOT EXISTS ghl_appointment_id TEXT,
  ADD COLUMN IF NOT EXISTS ghl_calendar_id    TEXT,
  ADD COLUMN IF NOT EXISTS ghl_synced_at      TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS schedule_items_ghl_appointment_id_key
  ON public.schedule_items (ghl_appointment_id)
  WHERE ghl_appointment_id IS NOT NULL;

ALTER TABLE public.contact_communications
  ADD COLUMN IF NOT EXISTS ghl_note_id   TEXT,
  ADD COLUMN IF NOT EXISTS ghl_synced_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS contact_communications_ghl_note_id_key
  ON public.contact_communications (ghl_note_id)
  WHERE ghl_note_id IS NOT NULL;


-- ── 2. ghl_connections ─────────────────────────────────────────────────────
-- One row holds the company's GHL Private Integration Token (PIT) plus the
-- sub-account location_id we sync against. The `singleton` column is fixed
-- to TRUE; the unique index on it enforces a single-row table.
CREATE TABLE IF NOT EXISTS public.ghl_connections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton       BOOLEAN NOT NULL DEFAULT TRUE,
  access_token    TEXT NOT NULL,           -- the PIT (or OAuth access token)
  refresh_token   TEXT,                    -- only used if we move to OAuth later
  token_expires_at TIMESTAMPTZ,            -- NULL for PITs (they don't expire)
  location_id     TEXT NOT NULL,           -- GHL sub-account location id
  company_id      TEXT,                    -- optional, for future agency use
  scopes          TEXT[],                  -- scopes granted on the token
  contacts_enabled       BOOLEAN NOT NULL DEFAULT TRUE,
  opportunities_enabled  BOOLEAN NOT NULL DEFAULT TRUE,
  appointments_enabled   BOOLEAN NOT NULL DEFAULT TRUE,
  notes_enabled          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS ghl_connections_singleton_key
  ON public.ghl_connections (singleton);


-- ── 3. ghl_sync_state ──────────────────────────────────────────────────────
-- One row per object type, holding the high-water-marks. Inbound = last
-- timestamp we pulled FROM GHL. Outbound = last timestamp we pushed TO GHL.
CREATE TABLE IF NOT EXISTS public.ghl_sync_state (
  object_type           TEXT PRIMARY KEY,    -- 'contacts' | 'opportunities' | 'appointments' | 'notes'
  inbound_synced_at     TIMESTAMPTZ,         -- updatedAt of newest record we pulled
  outbound_synced_at    TIMESTAMPTZ,         -- max(updated_at) we pushed
  last_run_at           TIMESTAMPTZ,         -- when the sync last ran (success or fail)
  last_run_status       TEXT,                -- 'ok' | 'error' | 'running'
  last_run_message      TEXT,                -- short status / error msg
  inbound_count_total   BIGINT NOT NULL DEFAULT 0,
  outbound_count_total  BIGINT NOT NULL DEFAULT 0,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.ghl_sync_state (object_type) VALUES
  ('contacts'), ('opportunities'), ('appointments'), ('notes')
ON CONFLICT (object_type) DO NOTHING;


-- ── 4. ghl_sync_log ────────────────────────────────────────────────────────
-- Append-only debug log. Useful when something goes sideways at 2am.
CREATE TABLE IF NOT EXISTS public.ghl_sync_log (
  id              BIGSERIAL PRIMARY KEY,
  ran_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  object_type     TEXT NOT NULL,
  direction       TEXT NOT NULL CHECK (direction IN ('inbound','outbound')),
  status          TEXT NOT NULL CHECK (status IN ('ok','error')),
  records_synced  INTEGER NOT NULL DEFAULT 0,
  message         TEXT,
  error_payload   JSONB
);

CREATE INDEX IF NOT EXISTS ghl_sync_log_ran_at_idx
  ON public.ghl_sync_log (ran_at DESC);

CREATE INDEX IF NOT EXISTS ghl_sync_log_object_type_idx
  ON public.ghl_sync_log (object_type, ran_at DESC);


-- ── 5. ghl_opportunities ───────────────────────────────────────────────────
-- Local mirror of GHL pipeline opportunities. We don't try to slot these
-- into PBS bids — bids are estimate-centric, opportunities are
-- contact-centric. Keeping them separate lets us reflect GHL's pipeline
-- view in the app and decide later whether/how to promote a won
-- opportunity into a PBS bid or job.
CREATE TABLE IF NOT EXISTS public.ghl_opportunities (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ghl_opportunity_id TEXT UNIQUE NOT NULL,
  ghl_contact_id    TEXT,                  -- GHL contact this opp is on
  contact_id        UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  pipeline_id       TEXT,
  pipeline_name     TEXT,
  stage_id          TEXT,
  stage_name        TEXT,
  status            TEXT,                  -- 'open' | 'won' | 'lost' | 'abandoned'
  name              TEXT,
  monetary_value    NUMERIC(14,2),
  assigned_to       TEXT,                  -- GHL user id; we don't try to map to auth.users yet
  source            TEXT,
  ghl_created_at    TIMESTAMPTZ,
  ghl_updated_at    TIMESTAMPTZ,
  ghl_synced_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ghl_opportunities_contact_id_idx
  ON public.ghl_opportunities (contact_id);

CREATE INDEX IF NOT EXISTS ghl_opportunities_pipeline_stage_idx
  ON public.ghl_opportunities (pipeline_id, stage_id);


-- ── 6. updated_at trigger helper (idempotent) ──────────────────────────────
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ghl_connections_set_updated_at ON public.ghl_connections;
CREATE TRIGGER ghl_connections_set_updated_at
  BEFORE UPDATE ON public.ghl_connections
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

DROP TRIGGER IF EXISTS ghl_sync_state_set_updated_at ON public.ghl_sync_state;
CREATE TRIGGER ghl_sync_state_set_updated_at
  BEFORE UPDATE ON public.ghl_sync_state
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

DROP TRIGGER IF EXISTS ghl_opportunities_set_updated_at ON public.ghl_opportunities;
CREATE TRIGGER ghl_opportunities_set_updated_at
  BEFORE UPDATE ON public.ghl_opportunities
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();


-- ── 7. RLS — admins manage; everyone reads ─────────────────────────────────
-- ghl_connections holds the access token, so we restrict reads to admins
-- only. The sync state, log, and opportunities are visible to all
-- authenticated users (you'll want to surface sync status and let users
-- view opportunity data in the app), but only admins can mutate them.

ALTER TABLE public.ghl_connections   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ghl_sync_state    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ghl_sync_log      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ghl_opportunities ENABLE ROW LEVEL SECURITY;

-- Drop policies first so the file is safe to re-run.
DROP POLICY IF EXISTS ghl_connections_admin_all       ON public.ghl_connections;
DROP POLICY IF EXISTS ghl_sync_state_select           ON public.ghl_sync_state;
DROP POLICY IF EXISTS ghl_sync_state_admin_modify     ON public.ghl_sync_state;
DROP POLICY IF EXISTS ghl_sync_log_select             ON public.ghl_sync_log;
DROP POLICY IF EXISTS ghl_sync_log_admin_insert       ON public.ghl_sync_log;
DROP POLICY IF EXISTS ghl_opportunities_select        ON public.ghl_opportunities;
DROP POLICY IF EXISTS ghl_opportunities_admin_modify  ON public.ghl_opportunities;

-- Helper: is the calling user an admin?
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin','super_admin')
  );
END;
$$;

-- ghl_connections: admins only, full CRUD
CREATE POLICY ghl_connections_admin_all ON public.ghl_connections
  FOR ALL TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

-- ghl_sync_state: everyone reads, admins write
CREATE POLICY ghl_sync_state_select ON public.ghl_sync_state
  FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY ghl_sync_state_admin_modify ON public.ghl_sync_state
  FOR ALL TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

-- ghl_sync_log: everyone reads (so all admins can debug), admins insert
CREATE POLICY ghl_sync_log_select ON public.ghl_sync_log
  FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY ghl_sync_log_admin_insert ON public.ghl_sync_log
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_user());

-- ghl_opportunities: everyone reads, admins/sync write
CREATE POLICY ghl_opportunities_select ON public.ghl_opportunities
  FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY ghl_opportunities_admin_modify ON public.ghl_opportunities
  FOR ALL TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ghl_connections   TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ghl_sync_state    TO authenticated;
GRANT SELECT, INSERT                  ON public.ghl_sync_log      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ghl_opportunities TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.ghl_sync_log_id_seq TO authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- Done. Phase 2 brings the Edge Function helper that uses ghl_connections.
-- ─────────────────────────────────────────────────────────────────────────────
