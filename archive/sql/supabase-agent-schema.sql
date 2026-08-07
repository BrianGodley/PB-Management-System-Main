-- ─────────────────────────────────────────────────────────────────────────────
-- supabase-agent-schema.sql
-- Tables for the in-app AI assistant ("Sam"). Phase 1: persistent chat threads
-- per user, the messages inside them, and an audit log of tool calls Sam made
-- on the user's behalf.
--
-- Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Conversations ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.agent_conversations (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT,                              -- optional human title; nullable
  model       TEXT,                              -- last model that answered (for telemetry)
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS agent_conversations_user_idx
  ON public.agent_conversations (user_id, updated_at DESC);

-- ── 2. Messages ─────────────────────────────────────────────────────────────
-- One row per turn (user, assistant, or tool result). `content` is the
-- rendered text for display; `raw` keeps the full message structure
-- (including tool_use / tool_result blocks) for replaying to the model.
CREATE TABLE IF NOT EXISTS public.agent_messages (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID         NOT NULL REFERENCES public.agent_conversations(id) ON DELETE CASCADE,
  role            TEXT         NOT NULL CHECK (role IN ('user', 'assistant', 'tool')),
  content         TEXT,                          -- text-only summary (NULL if pure tool message)
  raw             JSONB,                         -- full provider-format message blocks
  input_tokens    INTEGER,
  output_tokens   INTEGER,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS agent_messages_conv_idx
  ON public.agent_messages (conversation_id, created_at);

-- ── 3. Tool-call audit log ──────────────────────────────────────────────────
-- Every tool Sam invokes is logged so we can review what data was read on
-- the user's behalf. Helpful for debugging and for trust ("Sam, what did
-- you look at?"). Failures are captured in `error`.
CREATE TABLE IF NOT EXISTS public.agent_tool_calls (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID         NOT NULL REFERENCES public.agent_conversations(id) ON DELETE CASCADE,
  message_id      UUID         REFERENCES public.agent_messages(id) ON DELETE SET NULL,
  tool_name       TEXT         NOT NULL,
  arguments       JSONB,
  result          JSONB,
  error           TEXT,
  duration_ms     INTEGER,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS agent_tool_calls_conv_idx
  ON public.agent_tool_calls (conversation_id, created_at);

-- ── 4. updated_at trigger on conversations ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.touch_agent_conversation()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.agent_conversations
  SET updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS agent_messages_touch_conv ON public.agent_messages;
CREATE TRIGGER agent_messages_touch_conv
  AFTER INSERT ON public.agent_messages
  FOR EACH ROW EXECUTE FUNCTION public.touch_agent_conversation();

-- ── 5. RLS — users only see their own threads ──────────────────────────────
ALTER TABLE public.agent_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_tool_calls    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agent_convs_self"       ON public.agent_conversations;
DROP POLICY IF EXISTS "agent_msgs_self"        ON public.agent_messages;
DROP POLICY IF EXISTS "agent_tool_calls_self"  ON public.agent_tool_calls;

CREATE POLICY "agent_convs_self" ON public.agent_conversations
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "agent_msgs_self" ON public.agent_messages
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agent_conversations c
      WHERE c.id = agent_messages.conversation_id AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.agent_conversations c
      WHERE c.id = agent_messages.conversation_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "agent_tool_calls_self" ON public.agent_tool_calls
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agent_conversations c
      WHERE c.id = agent_tool_calls.conversation_id AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.agent_conversations c
      WHERE c.id = agent_tool_calls.conversation_id AND c.user_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_messages      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_tool_calls    TO authenticated;
