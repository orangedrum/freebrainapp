-- 37_fix_daily_checkins_brainlover_rls.sql
-- Fix RLS so BrainLovers can INSERT/UPDATE daily_checkins for their
-- linked FreeBrainers (including managed sub-accounts).
--
-- Root cause: The existing INSERT policy from migration 19 uses subqueries
-- on caregiver_links and managed_freebrainers. If those tables have RLS
-- enabled (they do), the subqueries run as the current user and may be
-- blocked by RLS recursion, causing the daily_checkins INSERT to fail
-- with "new row violates row-level security policy".
--
-- Fix: Use a SECURITY DEFINER function that bypasses RLS to check if
-- the current user is a valid BrainLover for the target patient_id.

-- ── 1. SECURITY DEFINER function: is_linked_brainlover ──
-- Returns true if auth.uid() is linked to the given patient_id via
-- caregiver_links OR is the manager of a managed_freebrainer sub-account.
-- SECURITY DEFINER bypasses RLS on caregiver_links and managed_freebrainers.
CREATE OR REPLACE FUNCTION public.is_linked_brainlover(target_patient_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.caregiver_links
    WHERE caregiver_id = auth.uid()
      AND patient_id = target_patient_id
  )
  OR EXISTS (
    SELECT 1 FROM public.managed_freebrainers
    WHERE managed_by = auth.uid()
      AND id = target_patient_id
  )
  OR auth.uid() = target_patient_id;
$$;

-- ── 2. Drop old INSERT policies and recreate using the function ──
DROP POLICY IF EXISTS "BrainLover insert linked check-ins" ON public.daily_checkins;
DROP POLICY IF EXISTS "Users insert own check-ins" ON public.daily_checkins;
DROP POLICY IF EXISTS "daily_checkins_insert" ON public.daily_checkins;

CREATE POLICY "daily_checkins_insert"
  ON public.daily_checkins FOR INSERT
  TO authenticated
  WITH CHECK (public.is_linked_brainlover(user_id));

-- ── 3. Drop old UPDATE policies and recreate using the function ──
DROP POLICY IF EXISTS "BrainLover update linked check-ins" ON public.daily_checkins;
DROP POLICY IF EXISTS "daily_checkins_update" ON public.daily_checkins;
DROP POLICY IF EXISTS "Users update own check-ins" ON public.daily_checkins;

CREATE POLICY "daily_checkins_update"
  ON public.daily_checkins FOR UPDATE
  TO authenticated
  USING (public.is_linked_brainlover(user_id))
  WITH CHECK (public.is_linked_brainlover(user_id));

-- ── 4. Drop old DELETE policies and recreate using the function ──
-- (needed for admin reset + BrainLover reset)
DROP POLICY IF EXISTS "daily_checkins_delete" ON public.daily_checkins;
DROP POLICY IF EXISTS "Users delete own check-ins" ON public.daily_checkins;

CREATE POLICY "daily_checkins_delete"
  ON public.daily_checkins FOR DELETE
  TO authenticated
  USING (public.is_linked_brainlover(user_id));

-- ── 5. Ensure SELECT policy allows BrainLovers to read linked check-ins ──
DROP POLICY IF EXISTS "daily_checkins_select" ON public.daily_checkins;
DROP POLICY IF EXISTS "Users can read own check-ins" ON public.daily_checkins;
DROP POLICY IF EXISTS "BrainLovers can read linked check-ins" ON public.daily_checkins;

CREATE POLICY "daily_checkins_select"
  ON public.daily_checkins FOR SELECT
  TO authenticated
  USING (public.is_linked_brainlover(user_id));

SELECT 'Migration 37: daily_checkins RLS fixed for BrainLover proxy check-ins!' as status;
