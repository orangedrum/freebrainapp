-- ============================================================
-- Migration 09: WIPE & RESET — Hard nuke all playlists, start clean
-- Run in Supabase SQL Editor
-- ============================================================
-- This deletes ALL rows from the playlists table AND user_playlist_selections.
-- After running this, the app's self-healing code (v15+) will also
-- automatically purge any PLACEHOLDER_* or invalid IDs on every load.
-- ============================================================

-- 1. Delete ALL user selections first (FK constraint)
DELETE FROM user_playlist_selections;

-- 2. Delete ALL playlists (both type='playlist' AND type='video')
DELETE FROM playlists;

-- 3. Re-seed the original default playlist only
INSERT INTO playlists (id, title, description, type, is_global_default, is_active, created_by)
VALUES (
  'PL68chWn4OAF_F8msHtkyWcNLXMVAaZSg3',
  'Daily Movement Therapy',
  'Official FreeBrain daily movement sessions',
  'playlist',
  true,
  true,
  null
);

-- 4. Verify — should show exactly 1 row
SELECT id, title, type, is_global_default, is_active, created_by
FROM playlists
ORDER BY created_at;

-- 5. Verify user_playlist_selections is empty
SELECT COUNT(*) AS selection_count FROM user_playlist_selections;
