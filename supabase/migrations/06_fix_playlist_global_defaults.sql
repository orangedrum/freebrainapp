-- ============================================================
-- Migration 06: Fix Playlist Global Defaults Propagation
-- Run in Supabase SQL Editor
-- Ensures all admin-added playlists are marked as global default
-- so they appear for ALL users, not just the admin who added them.
-- ============================================================

-- 1. Mark ALL playlists and videos added by admin as global defaults
UPDATE playlists
SET is_global_default = TRUE
WHERE is_active = TRUE
  AND created_by IN (
    SELECT user_id FROM user_roles WHERE role = 'admin'
  );

-- 2. Verify the fix
SELECT id, title, type, is_global_default, is_active
FROM playlists
ORDER BY created_at;

-- 3. If you need to manually set a specific playlist as global default:
-- UPDATE playlists SET is_global_default = TRUE WHERE id = 'YOUR_PLAYLIST_ID';
