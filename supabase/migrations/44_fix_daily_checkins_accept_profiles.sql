-- ============================================================
-- Migration 44: Fix daily_checkins trigger to accept legacy profiles
-- Run in Supabase SQL Editor
-- ============================================================
-- ROOT CAUSE: The validate_daily_checkin_user trigger (migrations
-- 40/43) only accepts user_ids in auth.users OR managed_freebrainers.
-- But legacy/orphaned patients exist ONLY in profiles — e.g. accounts
-- from before the managed_subaccounts schema, whose caregiver_links
-- patient_id survived while the auth.users row was removed/reset.
-- The app surfaces these patients (useBrainLoverData falls back to
-- profiles), but BrainLover proxy check-ins then fail with:
--   user_id <uuid> does not exist in auth.users or managed_freebrainers
--
-- FIX: Accept profiles.user_id as a valid check-in target too. This
-- matches the app's identity model (profiles IS the master user table
-- the dashboard, roster, and points system read from) and unblocks
-- legacy patients while still rejecting truly unknown UUIDs.
-- ============================================================

-- 1. Widen the trigger to also accept profiles.user_id
CREATE OR REPLACE FUNCTION public.validate_daily_checkin_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.user_id) THEN
    RETURN NEW;
  END IF;
  IF EXISTS (SELECT 1 FROM public.managed_freebrainers WHERE id = NEW.user_id) THEN
    RETURN NEW;
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = NEW.user_id) THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'user_id % does not exist in auth.users, managed_freebrainers, or profiles', NEW.user_id;
END;
$$;

-- 2. Re-attach the trigger (idempotent)
DROP TRIGGER IF EXISTS validate_daily_checkin_user ON public.daily_checkins;
CREATE TRIGGER validate_daily_checkin_user
  BEFORE INSERT OR UPDATE ON public.daily_checkins
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_daily_checkin_user();

SELECT 'Migration 44: daily_checkins now accepts auth.users, managed_freebrainers, and profiles user_ids!' as status;