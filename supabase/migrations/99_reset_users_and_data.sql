-- ============================================================
-- Utility: Reset All Users & Data
-- Run in Supabase SQL Editor
-- DESTRUCTIVE: Clears all users, profiles, teams, and test data.
-- Use only for fresh testing.
-- ============================================================

-- 1. Truncate all custom app tables
TRUNCATE TABLE public.user_cheers CASCADE;
TRUNCATE TABLE public.community_posts CASCADE;
TRUNCATE TABLE public.daily_checkins CASCADE;
TRUNCATE TABLE public.caregiver_links CASCADE;
TRUNCATE TABLE public.team_members CASCADE;
TRUNCATE TABLE public.teams CASCADE;
TRUNCATE TABLE public.profiles CASCADE;

-- 2. Clean out Supabase Auth users (This removes all user accounts so you can test fresh)
DELETE FROM auth.users;

-- Note: After running this script in your Supabase SQL Editor:
-- 1. All existing user accounts and auth sessions will be cleared.
-- 2. Clear your local browser cache / localStorage if you used Dev Bypass Auth (localStorage.removeItem('dev_bypass_auth')).
-- 3. You can now test fresh onboarding for FreeBrainer, BrainLover, and BrainLoverPro roles!
