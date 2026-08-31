-- ============================================================
-- Migration 07: Fix Admin RLS for Playlist Writes
-- Run in Supabase SQL Editor
-- ============================================================
-- ROOT CAUSE: The playlists_admin_write RLS policy checks
-- user_roles for role='admin' matching auth.uid(). But the
-- admin user (jeankaluza@gmail.com) may not have a row in
-- user_roles, so every UPDATE/INSERT silently fails (0 rows
-- affected, no error returned to client).
--
-- This migration:
-- 1. Finds the admin user by email
-- 2. Inserts/updates their admin role in user_roles
-- 3. Verifies the row exists
-- ============================================================

-- 1. Find the admin user's UUID by email
DO $$
DECLARE
  admin_uuid UUID;
BEGIN
  SELECT id INTO admin_uuid FROM auth.users WHERE email = 'jeankaluza@gmail.com' LIMIT 1;
  
  IF admin_uuid IS NOT NULL THEN
    -- Insert admin role if not exists
    INSERT INTO user_roles (user_id, role)
    VALUES (admin_uuid, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Admin role set for user: %', admin_uuid;
  ELSE
    RAISE NOTICE 'User jeankaluza@gmail.com not found in auth.users. They must log in at least once first.';
  END IF;
END $$;

-- 2. Verify the admin role exists
SELECT ur.user_id, u.email, ur.role
FROM user_roles ur
JOIN auth.users u ON u.id = ur.user_id
WHERE ur.role = 'admin';

-- 3. Also ensure ALL admin-added playlists/videos are active
-- (in case prior toggles silently failed due to RLS)
UPDATE playlists
SET is_active = TRUE
WHERE created_by IN (
  SELECT user_id FROM user_roles WHERE role = 'admin'
)
  AND type IN ('playlist', 'video');

-- 4. Verify all playlists are now active
SELECT id, title, type, is_global_default, is_active, created_by
FROM playlists
ORDER BY created_at;
