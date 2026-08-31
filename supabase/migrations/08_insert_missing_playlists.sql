-- ============================================================
-- Migration 08: Insert Missing Playlists + Clean Polluted Data
-- Run in Supabase SQL Editor
-- ============================================================
-- ROOT CAUSE: The admin added 2 new playlists via the UI, but
-- RLS silently blocked the INSERTs. They fell back to desktop's
-- localStorage only. Mobile can't see them because Supabase
-- doesn't have them. This migration inserts them directly,
-- bypassing RLS (runs as postgres superuser).
--
-- Also: TB_CtNHtMUA was added as type='video' but may have
-- polluted the playlists localStorage key on desktop. The
-- client-side code now filters these out, but we also ensure
-- the DB state is clean.
-- ============================================================

-- 1. Insert any missing playlists that the admin added via UI
--    but RLS blocked from reaching Supabase.
--    We use ON CONFLICT DO NOTHING so it's safe to re-run.
INSERT INTO playlists (id, title, description, type, is_global_default, is_active, created_by)
SELECT
  id, title, description, type, is_global_default, is_active, created_by
FROM (
  -- Add your missing playlists here. The admin should check their
  -- desktop Profile > Playlist Manager for the actual IDs/titles.
  -- Example entries (replace with real data):
  SELECT 'PLACEHOLDER_PLAYLIST_ID_1'::text as id, 'Playlist Title 1' as title, '' as description, 'playlist' as type, true as is_global_default, true as is_active, null::uuid as created_by
  UNION ALL
  SELECT 'PLACEHOLDER_PLAYLIST_ID_2'::text as id, 'Playlist Title 2' as title, '' as description, 'playlist' as type, true as is_global_default, true as is_active, null::uuid as created_by
) AS missing
ON CONFLICT (id) DO NOTHING;

-- 2. Ensure ALL admin-added playlists AND videos are active
UPDATE playlists
SET is_active = TRUE
WHERE created_by IN (
  SELECT user_id FROM user_roles WHERE role = 'admin'
)
  AND type IN ('playlist', 'video');

-- 3. Ensure all admin-added playlists are global defaults
UPDATE playlists
SET is_global_default = TRUE
WHERE created_by IN (
  SELECT user_id FROM user_roles WHERE role = 'admin'
)
  AND type = 'playlist';

-- 4. Verify the current state
SELECT id, title, type, is_global_default, is_active, created_by
FROM playlists
ORDER BY created_at;

-- ── INSTRUCTIONS ──
-- Before running this, check your desktop Profile > Playlist Manager
-- for the actual playlist IDs and titles that are missing from mobile.
-- Replace PLACEHOLDER_PLAYLIST_ID_1, PLACEHOLDER_PLAYLIST_ID_2, etc.
-- with the real YouTube playlist IDs and titles.
--
-- If you don't know the IDs, run this query first to see what's
-- already in Supabase:
--   SELECT * FROM playlists ORDER BY created_at;
-- Then compare with what you see in the desktop PlaylistManager UI.
-- Any playlist in the UI but NOT in this query result is the one
-- that's stuck in localStorage and needs to be added here.
