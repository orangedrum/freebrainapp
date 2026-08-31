-- 31_safe_user_deletion_template.sql
-- Template for safely deleting users by email address.
-- Run in Supabase SQL Editor. Replace the emails in the VALUES clause.
--
-- This script:
--  1. Looks up user IDs by email from auth.users
--  2. Deletes all related data (caregiver_links, managed_freebrainers, team_members,
--     daily_checkins, brainlover_interactions, activity_log, brainlover_notes,
--     brainlover_support, community_posts, session_notifications, profiles)
--  3. Deletes the auth.users row (removes login access)
--
-- ⚠️  REVIEW EACH SECTION BEFORE RUNNING. Uncomment the DELETE on auth.users
--     at the bottom only when you're ready to permanently remove login access.
--

-- ── TEMPLATE: Add emails here ──────────────────────────────────────
-- Replace these with the real emails you want to delete:
CREATE TEMP TABLE target_emails AS
SELECT * FROM (VALUES
  ('user1@example.com'),
  ('user2@example.com'),
  ('user3@example.com')
) AS t(email);

-- ── Resolve user IDs from emails into a temp table ──
-- This temp table persists for the entire session so all DELETEs can use it.
CREATE TEMP TABLE target_users AS
SELECT id, email
FROM auth.users
WHERE email IN (SELECT email FROM target_emails);

-- Preview who will be deleted (run this first to verify):
-- SELECT id, email, created_at FROM target_users;

-- ── Step 1: Delete caregiver_links where user is caregiver or patient ──
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'caregiver_links') THEN
    DELETE FROM public.caregiver_links
      WHERE caregiver_id IN (SELECT id FROM target_users)
         OR patient_id IN (SELECT id FROM target_users);
  END IF;
END $$;

-- ── Step 2: Delete managed_freebrainers (as manager or as the managed account) ──
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'managed_freebrainers') THEN
    DELETE FROM public.managed_freebrainers
      WHERE managed_by IN (SELECT id FROM target_users)
         OR id IN (SELECT id FROM target_users);
  END IF;
END $$;

-- ── Step 3: Delete team_memberships ──
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'team_members') THEN
    DELETE FROM public.team_members
      WHERE user_id IN (SELECT id FROM target_users);
  END IF;
END $$;

-- ── Step 4: Delete daily_checkins ──
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'daily_checkins') THEN
    DELETE FROM public.daily_checkins
      WHERE user_id IN (SELECT id FROM target_users);
  END IF;
END $$;

-- ── Step 5: Delete brainlover_interactions (as brainlover or freebrainer) ──
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'brainlover_interactions') THEN
    DELETE FROM public.brainlover_interactions
      WHERE brainlover_id IN (SELECT id FROM target_users)
         OR freebrainer_id IN (SELECT id FROM target_users);
  END IF;
END $$;

-- ── Step 6: Delete activity_log ──
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'activity_log') THEN
    DELETE FROM public.activity_log
      WHERE brainlover_id IN (SELECT id FROM target_users)
         OR freebrainer_id IN (SELECT id FROM target_users);
  END IF;
END $$;

-- ── Step 7: Delete brainlover_notes (as author or for the freebrainer) ──
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'brainlover_notes') THEN
    DELETE FROM public.brainlover_notes
      WHERE author_id IN (SELECT id FROM target_users)
         OR freebrainer_id IN (SELECT id FROM target_users);
  END IF;
END $$;

-- ── Step 8: Delete brainlover_support (from or to) ──
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'brainlover_support') THEN
    DELETE FROM public.brainlover_support
      WHERE from_brainlover_id IN (SELECT id FROM target_users)
         OR to_brainlover_id IN (SELECT id FROM target_users)
         OR freebrainer_id IN (SELECT id FROM target_users);
  END IF;
END $$;

-- ── Step 9: Delete community_posts ──
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'community_posts') THEN
    DELETE FROM public.community_posts
      WHERE user_id IN (SELECT id FROM target_users);
  END IF;
END $$;

-- ── Step 10: Delete session_notifications ──
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'session_notifications') THEN
    DELETE FROM public.session_notifications
      WHERE user_id IN (SELECT id FROM target_users);
  END IF;
END $$;

-- ── Step 11: Delete profiles ──
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    DELETE FROM public.profiles
      WHERE user_id IN (SELECT id FROM target_users);
  END IF;
END $$;

-- ── Step 12: Delete from auth.users (PERMANENT — removes login access) ──
-- ⚠️  Uncomment the lines below ONLY when you're ready to permanently
--     delete the auth.users records. This cannot be undone.
--
-- DELETE FROM auth.users
--   WHERE id IN (SELECT id FROM target_users);

-- ── Verification: Check what remains ──
-- SELECT id, email FROM auth.users WHERE email IN (SELECT email FROM target_emails);

SELECT 'Migration 31: Safe user deletion template ready. See comments for instructions.' as status;
