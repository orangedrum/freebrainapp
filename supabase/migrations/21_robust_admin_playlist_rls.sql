-- ============================================================
-- Migration 21: Robust Admin RLS for Playlists
-- Run in Supabase SQL Editor
-- ============================================================
-- ROOT CAUSE: The playlists_admin_write RLS policy ONLY checks
-- user_roles for role='admin'. If the admin user's row in
-- user_roles is missing (e.g. after a DB reset via migration 99),
-- every INSERT/UPDATE/DELETE on the playlists table fails with
-- "new row violates row-level security policy".
--
-- This migration:
-- 1. Re-creates the RLS policy to ALSO check the admin email
--    directly from auth.users as a fallback — so even if the
--    user_roles row is missing, the known admin can still write.
-- 2. Re-inserts the admin role into user_roles (idempotent).
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

-- 2. Drop and recreate the playlists_admin_write policy with
--    email-based fallback so RLS never blocks the known admin
DROP POLICY IF EXISTS "playlists_admin_write" ON playlists;

CREATE POLICY "playlists_admin_write" ON playlists
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
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
    OR EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid() AND u.email = 'jeankaluza@gmail.com'
    )
  );

-- 3. Verify
SELECT ur.user_id, u.email, ur.role
FROM user_roles ur
JOIN auth.users u ON u.id = ur.user_id
WHERE ur.role = 'admin';
