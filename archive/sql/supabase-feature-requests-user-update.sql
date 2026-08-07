-- ─────────────────────────────────────────────────────────────────────────
-- Allow users to amend their OWN feature_requests rows.
--
-- The existing policies only let users INSERT and SELECT their own tickets;
-- they had no UPDATE permission, so Sam couldn't help them edit a ticket
-- they'd already filed. This patch adds the missing policy. Admin policy
-- (feature_requests_admin_all) is untouched — admins keep unrestricted
-- access.
--
-- Column-level safety (preventing users from flipping status / priority /
-- admin_notes) is enforced at the tool layer in agent-chat/tools.ts —
-- update_feature_request only ever writes title, body, and category.
-- ─────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "feature_requests_update_own" ON feature_requests;
CREATE POLICY "feature_requests_update_own"
  ON feature_requests FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
