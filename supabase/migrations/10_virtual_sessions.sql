-- ──────────────────────────────────────────────────────────────
-- 10_virtual_sessions.sql
-- Creates the virtual_sessions table for tracking scheduled
-- 1-on-1 video calls between BrainLovers and FreeBrainers.
--
-- Phase 1: UI reads from this table (seed test rows manually).
-- Phase 2: Calendly webhook → Supabase Edge Function auto-populates.
--
-- Tier 2 (social) data only — no sensitive health data here.
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.virtual_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- The FreeBrainer who is attending the session
  freebrainer_email   TEXT NOT NULL,
  freebrainer_name    TEXT,
  -- The BrainLover / facilitator hosting the session
  brainlover_email    TEXT,
  brainlover_name     TEXT,
  -- Session timing (stored in UTC)
  session_start      TIMESTAMPTZ NOT NULL,
  session_end        TIMESTAMPTZ,
  -- 'upcoming', 'completed', 'cancelled', 'unmatched'
  status             TEXT NOT NULL DEFAULT 'upcoming',
  -- The video call URL (Zoom, Google Meet, etc.)
  join_url           TEXT,
  -- Calendly's unique event ID (for dedup when webhook is wired)
  calendly_event_id  TEXT UNIQUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_virtual_sessions_freebrainer_email
  ON public.virtual_sessions (freebrainer_email);
CREATE INDEX IF NOT EXISTS idx_virtual_sessions_status
  ON public.virtual_sessions (status);
CREATE INDEX IF NOT EXISTS idx_virtual_sessions_start
  ON public.virtual_sessions (session_start);

-- ──────────────────────────────────────────────────────────────
-- RLS Policies
-- ──────────────────────────────────────────────────────────────

ALTER TABLE public.virtual_sessions ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can READ sessions where they are the freebrainer
-- or the brainlover. Admins can read all.
CREATE POLICY "virtual_sessions_read_own"
  ON public.virtual_sessions
  FOR SELECT
  TO authenticated
  USING (
    freebrainer_email = auth.jwt() ->> 'email'
    OR brainlover_email = auth.jwt() ->> 'email'
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );

-- Admins can INSERT/UPDATE/DELETE (for seeding and management)
CREATE POLICY "virtual_sessions_admin_write"
  ON public.virtual_sessions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );

-- ──────────────────────────────────────────────────────────────
-- Seed test data (replace with real Calendly webhook later)
-- ──────────────────────────────────────────────────────────────

INSERT INTO public.virtual_sessions
  (freebrainer_email, freebrainer_name, brainlover_name, session_start, session_end, status, join_url)
VALUES
  ('jeankaluza+freebrainer@gmail.com', 'Jean (FreeBrainer)', 'Jean (Facilitator)',
   now() + INTERVAL '2 days', now() + INTERVAL '2 days 30 minutes',
   'upcoming', 'https://meet.google.com/test-session-1'),
  ('jeankaluza+freebrainer@gmail.com', 'Jean (FreeBrainer)', 'Jean (Facilitator)',
   now() + INTERVAL '9 days', now() + INTERVAL '9 days 30 minutes',
   'upcoming', 'https://meet.google.com/test-session-2'),
  ('jeankaluza+freebrainer@gmail.com', 'Jean (FreeBrainer)', 'Jean (Facilitator)',
   now() - INTERVAL '7 days', now() - INTERVAL '7 days 30 minutes',
   'completed', 'https://meet.google.com/test-session-past')
ON CONFLICT (calendly_event_id) DO NOTHING;
