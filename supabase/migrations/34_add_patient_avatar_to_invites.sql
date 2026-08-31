-- Migration 34: Add patient_avatar column to brainlover_invites
-- Stores the FreeBrainer's avatar URL at invite time so the invited
-- BrainLover can display it in their onboarding without needing to
-- query managed_freebrainers (which RLS blocks for them).

ALTER TABLE public.brainlover_invites
  ADD COLUMN IF NOT EXISTS patient_avatar text;
