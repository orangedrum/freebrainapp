-- ============================================================
-- Migration 47: Add INSERT policy for user_roles
-- ============================================================
-- Problem: Migration 17 enabled RLS on user_roles with only a
-- SELECT policy ("Leaderboard read user_roles"). There's no
-- INSERT policy, so handleComplete's role upsert silently
-- fails under RLS — new users who sign up via magic link
-- never get a row in user_roles, breaking the entire
-- onboarding resume flow.
--
-- Fix: Add a permissive INSERT policy allowing authenticated
-- users to insert their own role row.
-- ============================================================

-- Allow authenticated users to insert their own role row
DROP POLICY IF EXISTS "Users can insert own role" ON public.user_roles;
CREATE POLICY "Users can insert own role"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Ensure all existing user_roles rows remain accessible (SELECT already works)
SELECT 'user_roles insert policy added' as status;
