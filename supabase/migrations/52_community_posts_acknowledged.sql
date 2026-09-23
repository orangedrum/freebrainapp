-- Migration 52: acknowledged_at on community_posts (dismiss that sticks)
-- Dismissing a poke/cheer/video-rec previously wrote only to the SENDER's
-- browser localStorage, so on the recipient's device (or any fresh browser)
-- the dismiss was a no-op and the item always came back after reload.
-- This column makes acknowledgement server-side and cross-device.

ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS acknowledged_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_community_posts_unacked
  ON public.community_posts (user_id, created_at)
  WHERE acknowledged_at IS NULL;

-- Recipients may acknowledge (dismiss) rows addressed to them.
-- No UPDATE policy existed before; without this the write is denied.
DROP POLICY IF EXISTS "Recipients can acknowledge own posts" ON public.community_posts;
CREATE POLICY "Recipients can acknowledge own posts"
  ON public.community_posts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

SELECT 'Migration 52: community_posts acknowledged_at!' as status;
