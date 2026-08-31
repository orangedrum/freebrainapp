-- 25_managed_freebrainer_profile_columns.sql
-- Add profile-related columns to managed_freebrainers so BrainLovers
-- can edit their sub-account's full profile (location, story, movements, etc.)
-- Additive only — does NOT drop existing columns or policies.

ALTER TABLE public.managed_freebrainers
  ADD COLUMN IF NOT EXISTS avatar_url text DEFAULT '',
  ADD COLUMN IF NOT EXISTS favorite_movements text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS wearable_connected boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS locale text DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Allow BrainLovers to update their managed freebrainer rows
-- (existing policy from migration 02 already allows managed_by = auth.uid())
-- Just ensuring the policy is present:
DROP POLICY IF EXISTS "BrainLovers can update managed freebrainers" ON public.managed_freebrainers;
CREATE POLICY "BrainLovers can update managed freebrainers"
  ON public.managed_freebrainers FOR UPDATE
  USING (auth.uid() = managed_by)
  WITH CHECK (auth.uid() = managed_by);

-- Allow BrainLovers to read their managed freebrainer rows
DROP POLICY IF EXISTS "BrainLovers can read managed freebrainers" ON public.managed_freebrainers;
CREATE POLICY "BrainLovers can read managed freebrainers"
  ON public.managed_freebrainers FOR SELECT
  USING (auth.uid() = managed_by);

-- Allow BrainLovers to insert managed freebrainer rows
DROP POLICY IF EXISTS "BrainLovers can insert managed freebrainers" ON public.managed_freebrainers;
CREATE POLICY "BrainLovers can insert managed freebrainers"
  ON public.managed_freebrainers FOR INSERT
  WITH CHECK (auth.uid() = managed_by);

-- ── activity_log: ensure RLS allows BrainLovers to read/insert ──
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any, then recreate
DROP POLICY IF EXISTS "BrainLovers can read activity_log" ON public.activity_log;
CREATE POLICY "BrainLovers can read activity_log"
  ON public.activity_log FOR SELECT
  USING (
    auth.uid() = brainlover_id
    OR EXISTS (
      SELECT 1 FROM public.caregiver_links cl
      WHERE cl.caregiver_id = auth.uid()
        AND cl.patient_id = activity_log.freebrainer_id
    )
    OR EXISTS (
      SELECT 1 FROM public.managed_freebrainers mf
      WHERE mf.managed_by = auth.uid()
        AND mf.id = activity_log.freebrainer_id
    )
  );

DROP POLICY IF EXISTS "BrainLovers can insert activity_log" ON public.activity_log;
CREATE POLICY "BrainLovers can insert activity_log"
  ON public.activity_log FOR INSERT
  WITH CHECK (
    auth.uid() = brainlover_id
    OR EXISTS (
      SELECT 1 FROM public.caregiver_links cl
      WHERE cl.caregiver_id = auth.uid()
        AND cl.patient_id = activity_log.freebrainer_id
    )
    OR EXISTS (
      SELECT 1 FROM public.managed_freebrainers mf
      WHERE mf.managed_by = auth.uid()
        AND mf.id = activity_log.freebrainer_id
    )
  );

-- The FreeBrainer themselves can read their own activity log
DROP POLICY IF EXISTS "FreeBrainers can read own activity_log" ON public.activity_log;
CREATE POLICY "FreeBrainers can read own activity_log"
  ON public.activity_log FOR SELECT
  USING (
    auth.uid() = freebrainer_id
  );

SELECT 'Migration 25: managed_freebrainer profile columns + activity_log RLS applied!' as status;
