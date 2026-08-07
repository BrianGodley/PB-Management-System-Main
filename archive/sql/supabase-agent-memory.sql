-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-agent-memory.sql
-- Per-user memory for the in-app AI assistant ("Sam"). One row per user.
-- `notes` is a JSONB array of { id, text, created_at } objects. Sam appends
-- new entries via the remember_preference tool and can remove them with
-- forget_preference. The Edge Function reads this on every chat call and
-- injects the notes into Sam's system prompt as "USER PREFERENCES".
--
-- Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.agent_user_preferences (
  user_id     UUID         PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  notes       JSONB        NOT NULL DEFAULT '[]'::jsonb,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS agent_user_preferences_updated_idx
  ON public.agent_user_preferences (updated_at DESC);

-- ── updated_at touch trigger ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.touch_agent_user_preferences()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS agent_user_preferences_touch ON public.agent_user_preferences;
CREATE TRIGGER agent_user_preferences_touch
  BEFORE UPDATE ON public.agent_user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.touch_agent_user_preferences();

-- ── RLS — each user sees and edits only their own row ─────────────────────
ALTER TABLE public.agent_user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agent_prefs_self" ON public.agent_user_preferences;
CREATE POLICY "agent_prefs_self" ON public.agent_user_preferences
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_user_preferences TO authenticated;
