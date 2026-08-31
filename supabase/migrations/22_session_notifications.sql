-- Migration 22: session_notifications table for team/BrainLover session invites (ADR 006)
-- Stores in-app notifications when a user schedules a virtual session and
-- chooses to invite team members or BrainLovers.

CREATE TABLE IF NOT EXISTS public.session_notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL DEFAULT 'team_session_invite',
  message     TEXT,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: users can only see their own notifications
ALTER TABLE public.session_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own session notifications"
  ON public.session_notifications
  FOR SELECT
  USING (auth.uid() = recipient_id);

-- Allow inserts from authenticated users (the scheduler sends to others)
CREATE POLICY "Authenticated users can insert session notifications"
  ON public.session_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Users can mark their own notifications as read
CREATE POLICY "Users can update own session notifications"
  ON public.session_notifications
  FOR UPDATE
  USING (auth.uid() = recipient_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own session notifications"
  ON public.session_notifications
  FOR DELETE
  USING (auth.uid() = recipient_id);

-- Index for fast lookup by recipient
CREATE INDEX IF NOT EXISTS idx_session_notifications_recipient
  ON public.session_notifications(recipient_id)
  WHERE read_at IS NULL;
