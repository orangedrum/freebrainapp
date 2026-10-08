-- ──────────────────────────────────────────────────────────────
-- Migration 54: scheduled notifications plumbing (step 3)
--
-- step 3 needs sends that fire while the phone is CLOSED. Web Push needs a
-- signed-in client to trigger, so we add a server-side scheduler:
-- pg_cron runs every 5 minutes and calls the send-scheduled-notifications
-- Edge Function via pg_net. That function decides the three time-of-day
-- jobs; send-push still does the actual fan-out + preference gating.
--
-- This migration:
--   1. adds virtual_sessions.reminder_sent_at (one T-15 reminder per session)
--   2. adds notification_deliveries — a per-(kind, recipient, local-day)
--      dedupe ledger so a 5-minute cron can't double-send
--   3. enables pg_net + pg_cron and schedules the 5-minute trigger
--
-- ORDER: deploy the send-scheduled-notifications function BEFORE running this
-- migration so the very first scheduled call succeeds.
--
-- NOTE: the cron job sends the anon key (public by design — it already ships
-- in the client bundle). The Edge Function JWT gate accepts it, and the
-- function's work is idempotent per day, so a rogue caller can at most cause
-- the normal daily sends. Harden with a shared secret before public launch.
-- ──────────────────────────────────────────────────────────────

-- ── 1. One reminder per virtual session ────────────────────────
ALTER TABLE public.virtual_sessions
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_virtual_sessions_reminder_pending
  ON public.virtual_sessions (session_start)
  WHERE reminder_sent_at IS NULL AND status = 'upcoming';

-- ── 2. Dedupe ledger ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notification_deliveries (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind         TEXT NOT NULL,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_key      TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (kind, recipient_id, day_key)
);

-- Only the service_role (send-scheduled-notifications) touches this table.
ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;
-- No policies for authenticated/anon → clients cannot read or write it.

-- ── 3. Scheduler ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Re-scheduling the same job name updates it (idempotent re-run).
SELECT cron.schedule(
  'fb-scheduled-notifications',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://omcbwbhtjrozbgvzqdya.supabase.co/functions/v1/send-scheduled-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tY2J3Ymh0anJvemJndnpxZHlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzOTYwMDAsImV4cCI6MjA2OTk3MjAwMH0.n60lDzNIU7kJILSxx5H20gZRQ6yteyxEkkj0aM6jRiU',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tY2J3Ymh0anJvemJndnpxZHlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzOTYwMDAsImV4cCI6MjA2OTk3MjAwMH0.n60lDzNIU7kJILSxx5H20gZRQ6yteyxEkkj0aM6jRiU'
    ),
    body := '{}'::jsonb
  );
  $$
);

SELECT 'Migration 54: scheduled notifications ready!' as status;
