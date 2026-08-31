-- 40_fix_daily_checkins_fk_and_content_length.sql
--
-- Bug 1: daily_checkins.user_id has FK → auth.users(id). Managed sub-account
--        FreeBrainers have IDs from managed_freebrainers, not auth.users, so
--        BrainLover proxy check-ins fail with FK violation at the last step.
--        Same pattern as migrations 26/28/29/38 for other tables.
--
-- Bug 2: activity_log.content and brainlover_notes.content are varchar(40)
--        but the app now allows 140 chars. Inserts with >40 chars fail silently.

-- ── 1. Drop the daily_checkins user_id FK to auth.users ──
ALTER TABLE public.daily_checkins
  DROP CONSTRAINT IF EXISTS daily_checkins_user_id_fkey;

-- ── 2. Create validation trigger (allows auth.users OR managed_freebrainers) ──
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

-- ── 3. Widen content columns from varchar(40) to varchar(140) ──
ALTER TABLE public.activity_log
  ALTER COLUMN content TYPE varchar(140);

ALTER TABLE public.brainlover_notes
  ALTER COLUMN content TYPE varchar(140);

ALTER TABLE public.brainlover_support
  ALTER COLUMN content TYPE varchar(140);

SELECT 'Migration 40: daily_checkins FK relaxed + content columns widened to 140!' as status;
