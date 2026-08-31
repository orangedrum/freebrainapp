-- ──────────────────────────────────────────────────────────────
-- Migration 20: BrainLover can update linked FreeBrainer profiles
--
-- Problem: The profiles UPDATE RLS policy (migration 02) only allows
--   auth.uid() = managed_by OR auth.uid() = user_id.
-- When a BrainLover edits their FreeBrainer's profile in the "Them" tab,
-- neither condition is true, so RLS silently blocks the UPDATE
-- (0 rows changed, no error) — the success toast fires but nothing persists.
--
-- Fix: Add an UPDATE policy allowing caregivers to update profiles of
-- FreeBrainers linked to them via caregiver_links.
-- ──────────────────────────────────────────────────────────────

-- Drop existing managed-profiles UPDATE policy to replace with a broader one
DROP POLICY IF EXISTS "Users can update managed profiles" ON public.profiles;

-- New UPDATE policy: allow self, managed-by, OR linked caregiver
CREATE POLICY "Users can update own or linked profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR auth.uid() = managed_by
    OR user_id IN (
      SELECT patient_id
      FROM public.caregiver_links
      WHERE caregiver_id = auth.uid()
    )
  );

-- Also allow INSERT (upsert) for the same set of users
DROP POLICY IF EXISTS "Users can insert managed profiles" ON public.profiles;

CREATE POLICY "Users can insert own or linked profiles"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    OR auth.uid() = managed_by
    OR user_id IN (
      SELECT patient_id
      FROM public.caregiver_links
      WHERE caregiver_id = auth.uid()
    )
  );

SELECT 'BrainLover profile update RLS ready!' as status;
