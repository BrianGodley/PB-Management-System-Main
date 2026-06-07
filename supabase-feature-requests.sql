-- ============================================================
-- Feature Requests pipeline
-- Stores requests captured by Sam (or filed manually). Sam's
-- log_feature_request tool inserts here when a user asks Sam
-- to "log it". An email goes to Brian on each insert.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS feature_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES agent_conversations(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  category        TEXT NOT NULL DEFAULT 'feature' CHECK (category IN ('feature','bug','enhancement','other')),
  source          TEXT NOT NULL DEFAULT 'sam'     CHECK (source IN ('sam','manual')),
  status          TEXT NOT NULL DEFAULT 'new'     CHECK (status IN ('new','triaged','in_progress','done','declined')),
  priority        TEXT NOT NULL DEFAULT 'medium'  CHECK (priority IN ('low','medium','high')),
  admin_notes     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS feature_requests_status_idx   ON feature_requests(status);
CREATE INDEX IF NOT EXISTS feature_requests_user_idx     ON feature_requests(user_id);
CREATE INDEX IF NOT EXISTS feature_requests_created_idx  ON feature_requests(created_at DESC);

ALTER TABLE feature_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feature_requests_insert_own"
  ON feature_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "feature_requests_select_own"
  ON feature_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "feature_requests_admin_all"
  ON feature_requests FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','super_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','super_admin')));

CREATE OR REPLACE FUNCTION feature_requests_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS feature_requests_updated_at ON feature_requests;
CREATE TRIGGER feature_requests_updated_at
  BEFORE UPDATE ON feature_requests
  FOR EACH ROW EXECUTE FUNCTION feature_requests_set_updated_at();

COMMIT;


-- ─────────────────────────────────────────────────────────────────────────
-- Data API grants (Supabase change effective 2026-10-30 — new tables in
-- public are not exposed via PostgREST / supabase-js by default; this
-- block makes them reachable. RLS policies (above) still control rows.
-- ─────────────────────────────────────────────────────────────────────────
GRANT ALL ON public.feature_requests TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feature_requests TO authenticated;
