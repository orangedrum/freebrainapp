-- 27_fix_missing_columns.sql
-- Adds columns that are queried/inserted by the app but don't exist in the DB.
-- These missing columns cause 400 errors that break the BrainLover timeline
-- and the Profile "Them" tab.

-- ── 1. community_posts: add author_name, posted_by_id, type, post_type ──
-- The app inserts and queries these columns but they were never created.
ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS author_name TEXT;
ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS posted_by_id UUID;
ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'post';
ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS post_type TEXT DEFAULT 'post';

-- ── 2. managed_freebrainers: add deletion_scheduled_at ──
-- useProfileData queries this column to show deletion status in the "Them" tab.
ALTER TABLE public.managed_freebrainers ADD COLUMN IF NOT EXISTS deletion_scheduled_at TIMESTAMPTZ;

SELECT 'Migration 27: missing columns added to community_posts + managed_freebrainers!' as status;
