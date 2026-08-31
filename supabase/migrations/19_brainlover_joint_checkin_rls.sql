-- ──────────────────────────────────────────────────────────────
-- Migration 19: BrainLover joint check-in write access
--
-- Allows BrainLovers to create/update daily_checkins for their
-- linked FreeBrainers — so they can log a "joint movement" check-in
-- when they exercise together.
--
-- This is Tier 2 (social) data only: check-in status, points,
-- duration, movement type. No Tier 1 (sensitive) symptom data.
--
-- Prerequisites: Migration 18 (read access for caregiver_links)
-- ──────────────────────────────────────────────────────────────

-- ── 1. Allow BrainLovers to INSERT check-ins for linked FreeBrainers ──
DROP POLICY IF EXISTS "BrainLover insert linked check-ins" ON public.daily_checkins;

CREATE POLICY "BrainLover insert linked check-ins"
  ON public.daily_checkins FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR user_id IN (
      SELECT patient_id
      FROM public.caregiver_links
      WHERE caregiver_id = auth.uid()
    )
    OR user_id IN (
      SELECT id
      FROM public.managed_freebrainers
      WHERE managed_by = auth.uid()
    )
  );

-- ── 2. Allow BrainLovers to UPDATE check-ins for linked FreeBrainers ──
DROP POLICY IF EXISTS "BrainLover update linked check-ins" ON public.daily_checkins;

CREATE POLICY "BrainLover update linked check-ins"
  ON public.daily_checkins FOR UPDATE
  TO authenticated
  USING (
    user_id IN (
      SELECT patient_id
      FROM public.caregiver_links
      WHERE caregiver_id = auth.uid()
    )
    OR user_id IN (
      SELECT id
      FROM public.managed_freebrainers
      WHERE managed_by = auth.uid()
    )
  )
  WITH CHECK (
    user_id IN (
      SELECT patient_id
      FROM public.caregiver_links
      WHERE caregiver_id = auth.uid()
    )
    OR user_id IN (
      SELECT id
      FROM public.managed_freebrainers
      WHERE managed_by = auth.uid()
    )
  );
