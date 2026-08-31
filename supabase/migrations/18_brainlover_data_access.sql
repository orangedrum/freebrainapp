-- ──────────────────────────────────────────────────────────────
-- Migration 18: BrainLover dashboard data access
--
-- The BrainLover dashboard needs to read the selected FreeBrainer's:
--   - daily_checkins (for 30-day ratio, streak, leaderboard)
--   - profiles.email (for virtual session calendar filtering)
--
-- Problem: daily_checkins RLS only allows reading your own rows.
-- BrainLovers need to read their linked FreeBrainers' check-in data.
--
-- Solution:
--   1. Add `email` column to profiles (if not exists) so BrainLover
--      can query the FreeBrainer's email for virtual sessions.
--   2. Add RLS policy on daily_checkins allowing authenticated users
--      to read check-ins for users they're linked to via caregiver_links.
--
-- Tier 2 (social) data only — check-in status, streak, score.
-- No Tier 1 (sensitive) symptom data is stored in daily_checkins.
-- ──────────────────────────────────────────────────────────────

-- ── 1. Add email column to profiles (if not exists) ──
-- This stores the user's email so BrainLovers can query virtual sessions
-- by the FreeBrainer's email. Populated during onboarding/auth.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT DEFAULT NULL;

-- Backfill from auth.users for existing profiles
UPDATE public.profiles p
  SET email = au.email
  FROM auth.users au
  WHERE p.user_id = au.id
    AND (p.email IS NULL OR p.email = '');

-- ── 2. RLS policy: BrainLovers can read their linked FreeBrainers' check-ins ──
-- A caregiver_link (caregiver_id → patient_id) establishes the relationship.
-- This policy allows reading daily_checkins where:
--   - The row belongs to the current user (existing behavior), OR
--   - The row belongs to a FreeBrainer linked to the current user via caregiver_links
ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "BrainLover read linked check-ins" ON public.daily_checkins;

-- Create policy: allow reading check-ins for linked FreeBrainers
-- Uses a subquery on caregiver_links to verify the relationship
CREATE POLICY "BrainLover read linked check-ins"
  ON public.daily_checkins FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR user_id IN (
      SELECT patient_id
      FROM public.caregiver_links
      WHERE caregiver_id = auth.uid()
    )
  );

-- ── 3. Also allow reading managed_freebrainers' check-ins ──
-- Managed sub-accounts (created by Pro BrainLovers) should also be readable
DROP POLICY IF EXISTS "BrainLover read managed check-ins" ON public.daily_checkins;

CREATE POLICY "BrainLover read managed check-ins"
  ON public.daily_checkins FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id
      FROM public.managed_freebrainers
      WHERE managed_by = auth.uid()
    )
  );
