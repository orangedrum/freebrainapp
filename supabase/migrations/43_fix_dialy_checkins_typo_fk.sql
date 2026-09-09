-- 43_fix_dialy_checkins_typo_fk.sql
--
-- Root cause: the daily_checkins table has a stale FK constraint whose name
-- has a typo: `dialy_checkins_user_id_fkey` → auth.users(id).
--
-- Migrations 02 and 40 tried `DROP CONSTRAINT ... daily_checkins_user_id_fkey`
-- (correctly spelled), which never matched the live typo'd name, so the drop
-- was a silent no-op and the constraint survived. Managed (sub-account)
-- FreeBrainers have IDs in managed_freebrainers, NOT auth.users — so when a
-- BrainLover logs a FreeBrainer's movement (proxy or joint check-in), the
-- insert into daily_checkins fails at the last step with:
--
--   insert or update on table "daily_checkins" violates foreign key
--   constraint "dialy_checkins_user_id_fkey"
--
-- Fix: drop the FK (both spellings, plus any remaining FK targeting
-- auth.users) and rely on the validate_daily_checkin_user trigger, which
-- allows auth.users OR managed_freebrainers (introduced in migration 40).

-- 1. Drop the typo'd constraint (the live one) + the correctly-spelled one
--    that migration 02's ADD CONSTRAINT may have left behind.
ALTER TABLE public.daily_checkins DROP CONSTRAINT IF EXISTS dialy_checkins_user_id_fkey;
ALTER TABLE public.daily_checkins DROP CONSTRAINT IF EXISTS daily_checkins_user_id_fkey;

-- 2. Belt-and-braces: drop ANY remaining FK on daily_checkins that still
--    pins user_id to auth.users (same pattern as migrations 26/28/29/38/40).
DO $$
DECLARE
  con record;
BEGIN
  FOR con IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.daily_checkins'::regclass
      AND contype = 'f'
      AND confrelid = 'auth.users'::regclass
  LOOP
    EXECUTE format('ALTER TABLE public.daily_checkins DROP CONSTRAINT %I', con.conname);
  END LOOP;
END $$;

-- 3. Ensure the validation trigger exists (idempotent re-create).
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
  RAISE EXCEPTION 'user_id % does not exist in auth.users or managed_freebrainers', NEW.user_id;
END;
$$;

DROP TRIGGER IF EXISTS validate_daily_checkin_user ON public.daily_checkins;
CREATE TRIGGER validate_daily_checkin_user
  BEFORE INSERT OR UPDATE ON public.daily_checkins
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_daily_checkin_user();

SELECT 'Migration 43: dropped typo''d dialy_checkins FK + validation trigger active!' as status;