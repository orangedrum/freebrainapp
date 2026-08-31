-- 23_brainlover_updates_tables.sql
-- Foundation tables for the BrainLover Updates experience.
-- Additive only — does NOT touch existing tables or policies.

-- ──────────────────────────────────────────────
-- 1. brainlover_notes
--    Shared notes between BrainLovers of the same FreeBrainer.
--    Visible to all linked BrainLovers (solidarity / context sharing).
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.brainlover_notes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  freebrainer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content       varchar(40) NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brainlover_notes_freebrainer
  ON public.brainlover_notes (freebrainer_id, created_at DESC);

ALTER TABLE public.brainlover_notes ENABLE ROW LEVEL SECURITY;

-- INSERT: only a BrainLover linked to this FreeBrainer can post a note.
CREATE POLICY "brainlover_notes_insert" ON public.brainlover_notes
  FOR INSERT WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.caregiver_links cl
      WHERE cl.caregiver_id = auth.uid()
        AND cl.patient_id = freebrainer_id
    )
  );

-- SELECT: only BrainLovers linked to this FreeBrainer can read notes.
CREATE POLICY "brainlover_notes_select" ON public.brainlover_notes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.caregiver_links cl
      WHERE cl.caregiver_id = auth.uid()
        AND cl.patient_id = freebrainer_id
    )
  );

-- ──────────────────────────────────────────────
-- 2. activity_log
--    Non-video activity logged by BrainLovers on behalf of their FreeBrainer.
--    BrainLovers can read/insert; the FreeBrainer can read.
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.activity_log (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  freebrainer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brainlover_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content        varchar(40) NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_freebrainer
  ON public.activity_log (freebrainer_id, created_at DESC);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- INSERT: only a linked BrainLover can log activity.
CREATE POLICY "activity_log_insert" ON public.activity_log
  FOR INSERT WITH CHECK (
    brainlover_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.caregiver_links cl
      WHERE cl.caregiver_id = auth.uid()
        AND cl.patient_id = freebrainer_id
    )
  );

-- SELECT: linked BrainLovers OR the FreeBrainer themselves can read.
CREATE POLICY "activity_log_select" ON public.activity_log
  FOR SELECT USING (
    freebrainer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.caregiver_links cl
      WHERE cl.caregiver_id = auth.uid()
        AND cl.patient_id = freebrainer_id
    )
  );

-- ──────────────────────────────────────────────
-- 3. brainlover_support
--    Direct support note from one BrainLover to another.
--    Only the sender and recipient can read; any linked BL can send.
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.brainlover_support (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_brainlover_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_brainlover_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  freebrainer_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content            varchar(40) NOT NULL,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brainlover_support_recipient
  ON public.brainlover_support (to_brainlover_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_brainlover_support_freebrainer
  ON public.brainlover_support (freebrainer_id, created_at DESC);

ALTER TABLE public.brainlover_support ENABLE ROW LEVEL SECURITY;

-- INSERT: sender must be a linked BrainLover of this FreeBrainer.
CREATE POLICY "brainlover_support_insert" ON public.brainlover_support
  FOR INSERT WITH CHECK (
    from_brainlover_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.caregiver_links cl
      WHERE cl.caregiver_id = auth.uid()
        AND cl.patient_id = freebrainer_id
    )
  );

-- SELECT: only the sender or the recipient can read.
CREATE POLICY "brainlover_support_select" ON public.brainlover_support
  FOR SELECT USING (
    from_brainlover_id = auth.uid()
    OR to_brainlover_id = auth.uid()
  );

-- ──────────────────────────────────────────────
-- 4. Add management_mode column to caregiver_links
--    'manage'     → BrainLover runs the FreeBrainer's account
--    'independent' → FreeBrainer runs their own account
-- ──────────────────────────────────────────────
ALTER TABLE public.caregiver_links
  ADD COLUMN IF NOT EXISTS management_mode text NOT NULL DEFAULT 'manage';

-- Add a check constraint to enforce valid values.
ALTER TABLE public.caregiver_links
  DROP CONSTRAINT IF EXISTS chk_management_mode;
ALTER TABLE public.caregiver_links
  ADD CONSTRAINT chk_management_mode CHECK (management_mode IN ('manage', 'independent'));
