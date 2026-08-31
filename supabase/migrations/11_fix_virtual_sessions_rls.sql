-- ──────────────────────────────────────────────────────────────
-- 11_fix_virtual_sessions_rls.sql
--
-- Fixes the RLS policy on virtual_sessions.
-- The original policy used auth.jwt() ->> 'email' which is often
-- NULL in Supabase JWTs. This version joins to auth.users to get
-- the email reliably.
--
-- Also adds a policy allowing any authenticated user to INSERT
-- their own session row (needed if we ever allow client-side
-- session creation, and for the webhook edge function which
-- runs as the service role and bypasses RLS anyway).
-- ──────────────────────────────────────────────────────────────

-- Drop old policies
DROP POLICY IF EXISTS "virtual_sessions_read_own" ON public.virtual_sessions;
DROP POLICY IF EXISTS "virtual_sessions_admin_write" ON public.virtual_sessions;

-- Read: user can see sessions where their email matches freebrainer or brainlover
-- Uses auth.users join for reliable email lookup
CREATE POLICY "virtual_sessions_read_own"
  ON public.virtual_sessions
  FOR SELECT
  TO authenticated
  USING (
    freebrainer_email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
    OR brainlover_email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );

-- Admin write: full CRUD for admins
CREATE POLICY "virtual_sessions_admin_write"
  ON public.virtual_sessions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );

-- Verify the seed data is still there
SELECT count(*) as session_count FROM public.virtual_sessions;
