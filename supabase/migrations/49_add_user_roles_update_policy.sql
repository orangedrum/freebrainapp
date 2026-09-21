-- ============================================================
-- Migration 49: Add UPDATE policy for user_roles
-- ============================================================
-- Problem: Migration 17 enabled RLS on user_roles with only a
-- SELECT policy. Migration 47 added an INSERT policy. But there's
-- no UPDATE policy, so handleCompleteBrainLover's role upsert
-- silently fails under RLS — the parent's role stays "freebrainer"
-- instead of being updated to "brainlover".
--
-- Fix: Add a permissive UPDATE policy allowing authenticated
-- users to update their own role row.
-- ============================================================

-- Allow authenticated users to update their own role row
DROP POLICY IF EXISTS "Users can update own role" ON public.user_roles;
CREATE POLICY "Users can update own role"
ON public.user_roles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

SELECT 'user_roles update policy added' as status;
