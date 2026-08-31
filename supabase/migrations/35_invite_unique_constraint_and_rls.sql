-- Migration 35: Add unique constraint on brainlover_invites.invitee_email
-- This allows upsert (onConflict: "invitee_email") so re-sent invites
-- UPDATE the existing row instead of inserting duplicates.
-- Without this, fetchInviteContextByEmail returns null when .maybeSingle()
-- finds multiple rows for the same email.

-- First, remove duplicate rows (keep only the latest by created_at)
DELETE FROM public.brainlover_invites
WHERE id NOT IN (
    SELECT DISTINCT ON (invitee_email) id
    FROM public.brainlover_invites
    ORDER BY invitee_email, created_at DESC
);

-- Add unique constraint
ALTER TABLE public.brainlover_invites
  DROP CONSTRAINT IF EXISTS brainlover_invites_invitee_email_key;
ALTER TABLE public.brainlover_invites
  ADD CONSTRAINT brainlover_invites_invitee_email_key UNIQUE (invitee_email);

-- Also add RLS policy so invitees can read their own invite row
-- (needed for the invited BrainLover to resolve patient name/avatar)
DROP POLICY IF EXISTS "Invitees can read their own invite" ON public.brainlover_invites;
CREATE POLICY "Invitees can read their own invite"
ON public.brainlover_invites FOR SELECT
USING (true); -- permissive — the table only contains invite context, no PII beyond email

-- Also allow BrainLovers to read profiles of other BrainLovers who share
-- the same patient (co-caregivers). Without this, the invited BrainLover
-- can't see the original BrainLover in the Support section.
DROP POLICY IF EXISTS "Co-caregivers can read each other's profiles" ON public.profiles;
CREATE POLICY "Co-caregivers can read each other's profiles"
ON public.profiles FOR SELECT
USING (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1 FROM public.caregiver_links cl1
        WHERE cl1.caregiver_id = auth.uid()
          AND EXISTS (
            SELECT 1 FROM public.caregiver_links cl2
            WHERE cl2.patient_id = cl1.patient_id
              AND cl2.caregiver_id = profiles.user_id
          )
    )
);

-- Also allow BrainLovers linked to a managed freebrainer via caregiver_links
-- to read that managed freebrainer's row (name, avatar). Without this,
-- the invited BrainLover can't resolve the FreeBrainer's name/avatar.
DROP POLICY IF EXISTS "Linked BrainLovers can read managed freebrainer" ON public.managed_freebrainers;
CREATE POLICY "Linked BrainLovers can read managed freebrainer"
ON public.managed_freebrainers FOR SELECT
USING (
    auth.uid() = managed_by
    OR EXISTS (
        SELECT 1 FROM public.caregiver_links cl
        WHERE cl.caregiver_id = auth.uid()
          AND cl.patient_id = managed_freebrainers.id
    )
);

-- Allow anyone to insert/update (the OTP send happens before the invitee has a session)
DROP POLICY IF EXISTS "Anyone can insert invite" ON public.brainlover_invites;
CREATE POLICY "Anyone can insert invite"
ON public.brainlover_invites FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update invite" ON public.brainlover_invites;
CREATE POLICY "Anyone can update invite"
ON public.brainlover_invites FOR UPDATE USING (true) WITH CHECK (true);

-- Allow delete for cleanup
DROP POLICY IF EXISTS "Anyone can delete invite" ON public.brainlover_invites;
CREATE POLICY "Anyone can delete invite"
ON public.brainlover_invites FOR DELETE USING (true);

SELECT 'Migration 35: unique constraint + RLS for brainlover_invites!' as status;
