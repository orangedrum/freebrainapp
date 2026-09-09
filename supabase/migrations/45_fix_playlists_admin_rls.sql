-- ============================================================
-- Migration 45: Ensure admin can write playlists (RLS + role)
-- Run in Supabase SQL Editor
-- ============================================================
-- ROOT CAUSE: The playlists_admin_write RLS policy on the LIVE DB is
-- still the migration-05 version, which checks ONLY user_roles. If the
-- admin's user_roles row is missing (e.g. after a reset via migration
-- 99) every INSERT/UPDATE/DELETE on playlists fails with:
--   new row violates row-level security policy for table "playlists"
-- The app client marks isAdmin by email (AuthContext), so the admin
-- reaches PlaylistManager but RLS still blocks the write.
--
-- FIX (belt-and-suspenders, mirrors migration 21 for safety):
-- 1. Re-seed the 'admin' role into user_roles (idempotent).
-- 2. Recreate playlists_admin_write to allow writes when EITHER:
--    a) the user has role 'admin' in user_roles, OR
--    b) the JWT email matches the known admin (no auth.users lookup
--       needed), OR
--    c) the auth.users row matches the known admin (needs the
--       GRANT from migration 12, already applied).
-- ============================================================

-- 1. Ensure the admin user has the 'admin' role in user_roles
DO $$
DECLARE
  admin_uuid UUID;
BEGIN
  SELECT id INTO admin_uuid FROM auth.users WHERE email = 'jeankaluza@gmail.com' LIMIT 1;

  IF admin_uuid IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role)
    VALUES (admin_uuid, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;

    RAISE NOTICE 'Admin role ensured for user: %', admin_uuid;
  ELSE
    RAISE NOTICE 'User jeankaluza@gmail.com not found in auth.users. They must log in at least once first.';
  END IF;
END $$;

-- 2. Recreate the admin write policy with three redundant checks
DROP POLICY IF EXISTS "playlists_admin_write" ON playlists;

CREATE POLICY "playlists_admin_write" ON playlists
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
    OR auth.jwt() ->> 'email' = 'jeankaluza@gmail.com'
    OR EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid() AND u.email = 'jeankaluza@gmail.com'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
    OR auth.jwt() ->> 'email' = 'jeankaluza@gmail.com'
    OR EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid() AND u.email = 'jeankaluza@gmail.com'
    )
  );

-- 3. Make sure the SELECT-all policy still exists (idempotent)
DROP POLICY IF EXISTS "playlists_read_all" ON playlists;
CREATE POLICY "playlists_read_all" ON playlists
  FOR SELECT TO authenticated USING (TRUE);

-- 4. Verify
SELECT ur.user_id, u.email, ur.role
FROM user_roles ur
JOIN auth.users u ON u.id = ur.user_id
WHERE ur.role = 'admin';

SELECT pol.policyname, pol.cmd, pol.qual
FROM pg_policies pol
WHERE pol.schemaname = 'public' AND pol.tablename = 'playlists'
ORDER BY pol.policyname;