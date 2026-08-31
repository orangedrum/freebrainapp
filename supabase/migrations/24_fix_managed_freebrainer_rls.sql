-- 24_fix_managed_freebrainer_rls.sql
-- Fix RLS so BrainLovers can insert caregiver_links with managed_freebrainer IDs
-- and read managed_freebrainers they created.
-- Additive only — does NOT drop existing policies.

-- ──────────────────────────────────────────────
-- 1. managed_freebrainers: allow read for the managing BrainLover
--    (was named "Pros can read" — same policy, just clarifying)
-- ──────────────────────────────────────────────
-- The existing policy from migration 02 already allows:
--   SELECT: auth.uid() = managed_by
--   INSERT: auth.uid() = managed_by
--   UPDATE: auth.uid() = managed_by
-- These are correct. No change needed.

-- ──────────────────────────────────────────────
-- 2. caregiver_links: the INSERT policy is "Allow insert caregiver_links"
--    with WITH CHECK (true) — this is permissive enough.
--    BUT the validate_caregiver_link_patient trigger checks:
--      1. Does patient_id exist in auth.users?
--      2. Does patient_id exist in managed_freebrainers?
--    This should work. Let's verify the trigger is still active.
-- ──────────────────────────────────────────────

-- Ensure the trigger exists (re-create if dropped)
DROP TRIGGER IF EXISTS validate_caregiver_link_patient ON public.caregiver_links;

CREATE TRIGGER validate_caregiver_link_patient
BEFORE INSERT OR UPDATE ON public.caregiver_links
FOR EACH ROW
EXECUTE FUNCTION public.validate_caregiver_link_patient();

-- ──────────────────────────────────────────────
-- 3. team_members: allow managed_freebrainers to be team members
--    The FK on team_members.user_id references auth.users(id).
--    Managed freebrainers are NOT in auth.users, so we need to
--    relax this FK to allow managed_freebrainer IDs too.
-- ──────────────────────────────────────────────

-- Drop the FK that requires user_id to be in auth.users
ALTER TABLE public.team_members
  DROP CONSTRAINT IF EXISTS team_members_user_id_fkey;

-- Add a new FK that allows both auth.users AND managed_freebrainers
-- We use a trigger to validate instead of a hard FK
CREATE OR REPLACE FUNCTION public.validate_team_member_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.user_id) THEN
        RETURN NEW;
    END IF;
    IF EXISTS (SELECT 1 FROM public.managed_freebrainers WHERE id = NEW.user_id) THEN
        RETURN NEW;
    END IF;
    RAISE EXCEPTION 'user_id must reference auth.users or managed_freebrainers';
END;
$$;

DROP TRIGGER IF EXISTS validate_team_member_user ON public.team_members;
CREATE TRIGGER validate_team_member_user
BEFORE INSERT OR UPDATE ON public.team_members
FOR EACH ROW
EXECUTE FUNCTION public.validate_team_member_user();

-- ──────────────────────────────────────────────
-- 4. profiles: allow BrainLovers to read profiles of FreeBrainers
--    they manage (via managed_freebrainers table).
--    The existing policy checks auth.uid() = managed_by, but
--    managed_freebrainers don't have a profiles row. We need a
--    policy that allows reading profiles where the user_id is
--    referenced in caregiver_links as a patient of auth.uid().
-- ──────────────────────────────────────────────

-- The existing "Users can read managed profiles" policy checks:
--   auth.uid() = managed_by OR auth.uid() = user_id
-- This is fine for profiles that have managed_by set.
-- For caregiver_links-based access, we add a supplementary policy.

DROP POLICY IF EXISTS "BrainLovers can read linked patient profiles" ON public.profiles;
CREATE POLICY "BrainLovers can read linked patient profiles"
ON public.profiles FOR SELECT
USING (
    auth.uid() = user_id
    OR auth.uid() = managed_by
    OR EXISTS (
        SELECT 1 FROM public.caregiver_links cl
        WHERE cl.caregiver_id = auth.uid()
          AND cl.patient_id = profiles.user_id
    )
);

SELECT 'Migration 24: managed freebrainer RLS fixes applied!' as status;
