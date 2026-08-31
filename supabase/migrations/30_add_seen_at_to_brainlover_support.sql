-- 30_add_seen_at_to_brainlover_support.sql
-- Add seen_at column to track when a BrainLover has read a support message.
-- Badge logic: seen_at IS NULL + created_at within 24hrs = unread (show red dot).
-- Badge clears when: seen_at is set (user opened the section) OR after 24hrs (hard cap).

ALTER TABLE public.brainlover_support
  ADD COLUMN IF NOT EXISTS seen_at timestamptz;

-- Index for fast "unread count" queries: WHERE to_brainlover_id = X AND seen_at IS NULL AND created_at > now() - interval '24 hours'
CREATE INDEX IF NOT EXISTS idx_brainlover_support_unread
  ON public.brainlover_support (to_brainlover_id, seen_at, created_at DESC);

-- UPDATE policy: only the recipient can mark messages as seen.
CREATE POLICY "brainlover_support_update_seen" ON public.brainlover_support
  FOR UPDATE USING (
    to_brainlover_id = auth.uid()
  );
