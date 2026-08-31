-- ──────────────────────────────────────────────────────────────
-- 12_fix_virtual_sessions_rls_v2.sql
--
-- Restores the working auth.jwt() ->> 'email' RLS policy
-- from migration 10 (which WORKED) and adds auth.users access
-- as a fallback. Migration 11's auth.users-only approach caused
-- 403 errors because the `authenticated` role doesn't have
-- SELECT permission on the auth.users table by default.
-- ──────────────────────────────────────────────────────────────

-- Drop ALL existing policies (from both 10 and 11)
DROP POLICY IF EXISTS "virtual_sessions_read_own" ON public.virtual_sessions;
DROP POLICY IF EXISTS "virtual_sessions_admin_write" ON public.virtual_sessions;

-- Grant access to auth.users for the authenticated role (belt-and-suspenders)
-- This allows the auth.users subquery to work in RLS policies
GRANT SELECT ON auth.users TO authenticated;

-- Read: user can see sessions where their email matches freebrainer or brainlover
-- Uses BOTH auth.jwt() (primary) and auth.users lookup (fallback)
CREATE POLICY "virtual_sessions_read_own"
  ON public.virtual_sessions
  FOR SELECT
  TO authenticated
  USING (
    -- Primary: JWT email (this is what worked in migration 10)
    freebrainer_email = auth.jwt() ->> 'email'
    OR brainlover_email = auth.jwt() ->> 'email'
    -- Fallback: auth.users lookup (now works with the GRANT above)
    OR freebrainer_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR brainlover_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    -- Admins can always read
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

-- Verify seed data is still present
SELECT count(*) as session_count, 
       (SELECT count(*) FROM public.virtual_sessions WHERE status = 'upcoming') as upcoming_count
FROM public.virtual_sessions;
