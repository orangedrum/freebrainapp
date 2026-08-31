-- ============================================================
-- Migration 05: Playlists Config (Supabase-backed)
-- Run in Supabase SQL Editor
-- Moves playlist config from localStorage-only to Supabase-backed
-- so admin changes propagate to ALL devices instantly.
-- ============================================================

-- 1. playlists table (admin-managed global catalog)
CREATE TABLE IF NOT EXISTS playlists (
  id              TEXT PRIMARY KEY,          -- YouTube playlist ID or video ID
  title           TEXT NOT NULL DEFAULT 'YouTube Playlist',
  description     TEXT DEFAULT '',
  type            TEXT NOT NULL DEFAULT 'playlist',  -- 'playlist' | 'video'
  thumbnail       TEXT DEFAULT '',
  is_global_default BOOLEAN NOT NULL DEFAULT FALSE, -- admin-set
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,    -- admin can deactivate
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. user_playlist_selections table (per-user active selections)
CREATE TABLE IF NOT EXISTS user_playlist_selections (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  playlist_id TEXT NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, playlist_id)
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_user_playlist_selections_user
  ON user_playlist_selections(user_id);
CREATE INDEX IF NOT EXISTS idx_playlists_global_default
  ON playlists(is_global_default) WHERE is_global_default = TRUE;

-- 4. RLS Policies
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_playlist_selections ENABLE ROW LEVEL SECURITY;

-- playlists: anyone authenticated can read; only admin can write
DROP POLICY IF EXISTS "playlists_read_all" ON playlists;
CREATE POLICY "playlists_read_all" ON playlists
  FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS "playlists_admin_write" ON playlists;
CREATE POLICY "playlists_admin_write" ON playlists
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- user_playlist_selections: users can CRUD their own selections
DROP POLICY IF EXISTS "ups_user_read" ON user_playlist_selections;
CREATE POLICY "ups_user_read" ON user_playlist_selections
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "ups_user_insert" ON user_playlist_selections;
CREATE POLICY "ups_user_insert" ON user_playlist_selections
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "ups_user_update" ON user_playlist_selections;
CREATE POLICY "ups_user_update" ON user_playlist_selections
  FOR UPDATE TO authenticated USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "ups_user_delete" ON user_playlist_selections;
CREATE POLICY "ups_user_delete" ON user_playlist_selections
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 5. Seed the default playlist
INSERT INTO playlists (id, title, description, type, is_global_default, is_active)
VALUES (
  'PL68chWn4OAF_F8msHtkyWcNLXMVAaZSg3',
  'Daily Movement Therapy',
  'Official FreeBrain daily movement sessions',
  'playlist',
  TRUE,
  TRUE
)
ON CONFLICT (id) DO NOTHING;

-- 6. updated_at trigger (fires on INSERT and UPDATE)
CREATE OR REPLACE FUNCTION update_playlists_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_playlists_updated_at ON playlists;
CREATE TRIGGER trg_playlists_updated_at
  BEFORE INSERT OR UPDATE ON playlists
  FOR EACH ROW EXECUTE FUNCTION update_playlists_updated_at();

-- 7. Fix any existing single videos that were inserted with is_global_default=false
--    Run this once after migration to retroactively mark admin-added videos as global
UPDATE playlists
SET is_global_default = TRUE
WHERE type = 'video'
  AND is_active = TRUE
  AND created_by = (SELECT user_id FROM user_roles WHERE role = 'admin' LIMIT 1);
