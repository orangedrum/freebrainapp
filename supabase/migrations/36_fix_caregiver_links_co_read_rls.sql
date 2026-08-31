-- Migration 36: Fix caregiver_links RLS so co-caregivers can see each other
--
-- PROBLEM: The "Other BrainLovers" section in BrainLoverSupportSection
-- queries caregiver_links for ALL caregivers linked to the same patient,
-- then fetches their profiles. But:
--   1. caregiver_links RLS from migration 01 is permissive (USING true),
--      so that's fine.
--   2. profiles RLS blocks reading other users' profiles unless there's
--      a co-caregiver policy. Migration 35 added one, but it uses nested
--      EXISTS subqueries on caregiver_links which can hit RLS recursion
--      limits in Postgres.
--
-- FIX: Simplify the profiles co-caregiver RLS to a single-level subquery
-- (no nested EXISTS inside EXISTS). Also add a SECURITY DEFINER function
-- as a fallback that bypasses RLS for the co-caregiver check.

-- ── 1. Create a SECURITY DEFINER function to check co-caregiver status ──
-- This bypasses RLS recursion by running as the function owner (postgres).
CREATE OR REPLACE FUNCTION public.is_co_caregiver(check_user_id UUID, patient_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.caregiver_links cl1
    WHERE cl1.caregiver_id = check_user_id
      AND cl1.patient_id = patient_id
  );
END;
$$;

-- ── 2. Simplify profiles RLS for co-caregivers ──
-- Drop the recursive policy from migration 35 and replace with one that
-- uses the SECURITY DEFINER function (no RLS recursion).
DROP POLICY IF EXISTS "Co-caregivers can read each other's profiles" ON public.profiles;
CREATE POLICY "Co-caregivers can read each other's profiles"
ON public.profiles FOR SELECT
USING (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1 FROM public.caregiver_links cl
        WHERE cl.caregiver_id = auth.uid()
          AND public.is_co_caregiver(profiles.user_id, cl.patient_id)
    )
);

-- ── 3. Ensure caregiver_links SELECT is permissive (already is from migration 01) ──
-- Just re-assert it in case a later migration tightened it.
DROP POLICY IF EXISTS "Allow read caregiver_links" ON public.caregiver_links;
CREATE POLICY "Allow read caregiver_links" ON public.caregiver_links FOR SELECT USING (true);

-- ── 4. Grant execute on the helper function ──
GRANT EXECUTE ON FUNCTION public.is_co_caregiver(UUID, UUID) TO authenticated;

SELECT 'Migration 36: co-caregiver RLS fixed with SECURITY DEFINER function!' as status;
