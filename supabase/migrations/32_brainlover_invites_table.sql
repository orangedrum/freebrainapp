-- Migration 32: brainlover_invites table
-- Stores invite context keyed by invitee email so it survives magic link redirects.
-- user_metadata only works for NEW users; existing users need this table fallback.

CREATE TABLE IF NOT EXISTS public.brainlover_invites (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invitee_email text    NOT NULL,
  patient_id    text,
  caregiver_id  text,
  patient_name  text,
  inviter_name  text,
  role          text,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brainlover_invites_email ON public.brainlover_invites (invitee_email);

-- RLS: anyone can read by their own email (we filter in code), insert is open
-- (the inviter is authenticated when they send the invite)
ALTER TABLE public.brainlover_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "brainlover_invites_read" ON public.brainlover_invites;
CREATE POLICY "brainlover_invites_read" ON public.brainlover_invites
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "brainlover_invites_insert" ON public.brainlover_invites;
CREATE POLICY "brainlover_invites_insert" ON public.brainlover_invites
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "brainlover_invites_delete" ON public.brainlover_invites;
CREATE POLICY "brainlover_invites_delete" ON public.brainlover_invites
  FOR DELETE USING (true);
