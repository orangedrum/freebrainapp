-- Migration 50: parent-invite child resume fields on brainlover_invites
-- When a child FreeBrainer (under 18) stops at the age gate and invites a
-- parent, the child has no auth user yet, so patient_id stays NULL until the
-- child finishes onboarding AFTER the parent. These columns let the parent's
-- completion send the child a "finish your onboarding" link, and let the
-- child resume (same device or, via this row, a different device):
--   child_email      — the child's email, captured at the age gate
--   child_name       — the child's display name (prefill on resume)
--   child_avatar     — the child's photo URL (prefill on resume)
--   child_birth_year — birth year from the age-gate dropdown
-- RLS on this table is fully permissive (migration 35), so no new policies.

ALTER TABLE public.brainlover_invites
  ADD COLUMN IF NOT EXISTS child_email text,
  ADD COLUMN IF NOT EXISTS child_name text,
  ADD COLUMN IF NOT EXISTS child_avatar text,
  ADD COLUMN IF NOT EXISTS child_birth_year text;

CREATE INDEX IF NOT EXISTS idx_brainlover_invites_child_email
  ON public.brainlover_invites (child_email);

SELECT 'Migration 50: child resume fields on brainlover_invites!' as status;
