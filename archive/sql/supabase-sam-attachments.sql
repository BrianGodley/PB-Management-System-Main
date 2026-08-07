-- ─────────────────────────────────────────────────────────────────────────
-- Sam chat attachments + support-ticket attachments
--
-- Lets users attach photos and documents to Sam-chat messages. Files live
-- in the `sam-attachments` storage bucket under each user's own folder.
-- When Sam files a support ticket via the log_feature_request tool, every
-- attachment from the conversation is auto-copied into the ticket so admins
-- in the Help center can see them.
--
-- Tables:
--   agent_message_attachments    — one row per file attached to a chat message
--   feature_request_attachments  — one row per file attached to a ticket
--                                  (linked back to the originating chat attachment
--                                  via source_message_attachment_id for traceability)
--
-- File limits enforced by the storage bucket: 25 MB per file; mime-types
-- whitelisted to images, PDFs, Word docs, and Excel.
-- ─────────────────────────────────────────────────────────────────────────

BEGIN;

-- ── 1. Storage bucket ──────────────────────────────────────────────────────
-- Bucket is private. Files are served via signed URLs generated server-side
-- (or via the Supabase JS client for authorised users).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'sam-attachments',
  'sam-attachments',
  false,
  25 * 1024 * 1024,                       -- 25 MB hard limit
  ARRAY[
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ── 2. Storage RLS — each user only touches their own folder ──────────────
-- Storage paths are namespaced by user_id so this policy is just a folder
-- ownership check. Object keys look like:
--   {user_id}/{conversation_id}/{uuid}_{original_filename}
DROP POLICY IF EXISTS "sam_attachments_user_select" ON storage.objects;
DROP POLICY IF EXISTS "sam_attachments_user_insert" ON storage.objects;
DROP POLICY IF EXISTS "sam_attachments_user_update" ON storage.objects;
DROP POLICY IF EXISTS "sam_attachments_user_delete" ON storage.objects;

CREATE POLICY "sam_attachments_user_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'sam-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "sam_attachments_user_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'sam-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "sam_attachments_user_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'sam-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "sam_attachments_user_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'sam-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Admins (role membership lives in the profiles table) can READ any file
-- so they can review attachments on tickets routed to the Help center.
DROP POLICY IF EXISTS "sam_attachments_admin_select" ON storage.objects;
CREATE POLICY "sam_attachments_admin_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'sam-attachments'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
       WHERE p.id = auth.uid()
         AND p.role IN ('admin','super_admin')
    )
  );

-- ── 3. agent_message_attachments — files attached to a chat message ───────
CREATE TABLE IF NOT EXISTS public.agent_message_attachments (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id       UUID         NOT NULL REFERENCES public.agent_messages(id) ON DELETE CASCADE,
  conversation_id  UUID         NOT NULL REFERENCES public.agent_conversations(id) ON DELETE CASCADE,
  user_id          UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path     TEXT         NOT NULL,         -- key inside the sam-attachments bucket
  file_name        TEXT         NOT NULL,         -- original filename from the user's device
  mime_type        TEXT         NOT NULL,
  size_bytes       BIGINT       NOT NULL,
  kind             TEXT         NOT NULL CHECK (kind IN ('image','pdf','office','other')),
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS agent_message_attachments_msg_idx
  ON public.agent_message_attachments (message_id);
CREATE INDEX IF NOT EXISTS agent_message_attachments_conv_idx
  ON public.agent_message_attachments (conversation_id, created_at);

ALTER TABLE public.agent_message_attachments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "agent_msg_atts_self" ON public.agent_message_attachments;
CREATE POLICY "agent_msg_atts_self" ON public.agent_message_attachments
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins can read all message attachments (for ticket review).
DROP POLICY IF EXISTS "agent_msg_atts_admin_select" ON public.agent_message_attachments;
CREATE POLICY "agent_msg_atts_admin_select" ON public.agent_message_attachments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
       WHERE p.id = auth.uid() AND p.role IN ('admin','super_admin')
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.agent_message_attachments TO authenticated;

-- ── 4. feature_request_attachments — files visible on a support ticket ───
-- One row per file linked to a ticket. When Sam files a ticket from a chat
-- with attachments, the log_feature_request tool inserts one row here per
-- agent_message_attachment in the conversation, pointing at the SAME
-- storage_path (no file duplication — both tables reference the same
-- object in the sam-attachments bucket).
CREATE TABLE IF NOT EXISTS public.feature_request_attachments (
  id                            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_request_id            UUID         NOT NULL REFERENCES public.feature_requests(id) ON DELETE CASCADE,
  source_message_attachment_id  UUID         REFERENCES public.agent_message_attachments(id) ON DELETE SET NULL,
  user_id                       UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path                  TEXT         NOT NULL,
  file_name                     TEXT         NOT NULL,
  mime_type                     TEXT         NOT NULL,
  size_bytes                    BIGINT       NOT NULL,
  kind                          TEXT         NOT NULL CHECK (kind IN ('image','pdf','office','other')),
  created_at                    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS feature_request_attachments_fr_idx
  ON public.feature_request_attachments (feature_request_id);

ALTER TABLE public.feature_request_attachments ENABLE ROW LEVEL SECURITY;

-- Users see their own ticket attachments.
DROP POLICY IF EXISTS "fr_atts_self" ON public.feature_request_attachments;
CREATE POLICY "fr_atts_self" ON public.feature_request_attachments
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins see all ticket attachments.
DROP POLICY IF EXISTS "fr_atts_admin_select" ON public.feature_request_attachments;
CREATE POLICY "fr_atts_admin_select" ON public.feature_request_attachments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
       WHERE p.id = auth.uid() AND p.role IN ('admin','super_admin')
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.feature_request_attachments TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
