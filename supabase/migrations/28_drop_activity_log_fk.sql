-- 28_drop_activity_log_fk.sql
--
-- Migration 26 tried to relax the FK by making it DEFERRABLE, but the FK to
-- auth.users(id) is STILL checked at commit time. Managed sub-account IDs
-- (from managed_freebrainers) don't exist in auth.users, so inserts still
-- fail with 409. The trigger validates against both tables, so the FK is
-- redundant and harmful.
--
-- Fix: DROP the FK constraints entirely. The triggers from migration 26
-- handle validation (they check both auth.users AND managed_freebrainers).

-- ── 1. Drop FK on activity_log.freebrainer_id ──
ALTER TABLE public.activity_log
  DROP CONSTRAINT IF EXISTS activity_log_freebrainer_id_fkey;

-- ── 2. Drop FK on brainlover_notes.freebrainer_id ──
ALTER TABLE public.brainlover_notes
  DROP CONSTRAINT IF EXISTS brainlover_notes_freebrainer_id_fkey;

-- ── 3. Drop FK on brainlover_support.freebrainer_id ──
ALTER TABLE public.brainlover_support
  DROP CONSTRAINT IF EXISTS brainlover_support_freebrainer_id_fkey;

-- ── 4. Also drop FKs on brainlover_id / from_brainlover_id / to_brainlover_id
--    that reference auth.users — these block BrainLovers who haven't verified
--    email yet (no auth.users row). The triggers already validate. ──
ALTER TABLE public.activity_log
  DROP CONSTRAINT IF EXISTS activity_log_brainlover_id_fkey;

ALTER TABLE public.brainlover_notes
  DROP CONSTRAINT IF EXISTS brainlover_notes_author_id_fkey;

ALTER TABLE public.brainlover_support
  DROP CONSTRAINT IF EXISTS brainlover_support_from_brainlover_id_fkey;

ALTER TABLE public.brainlover_support
  DROP CONSTRAINT IF EXISTS brainlover_support_to_brainlover_id_fkey;

-- ── 5. Ensure triggers from migration 26 still exist (re-create if dropped) ──
-- These validate that freebrainer_id exists in auth.users OR managed_freebrainers.
CREATE OR REPLACE FUNCTION public.validate_activity_log_freebrainer()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.freebrainer_id) THEN
    RETURN NEW;
  END IF;
  IF EXISTS (SELECT 1 FROM public.managed_freebrainers WHERE id = NEW.freebrainer_id) THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'freebrainer_id % does not exist in auth.users or managed_freebrainers', NEW.freebrainer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS validate_activity_log_freebrainer ON public.activity_log;
CREATE TRIGGER validate_activity_log_freebrainer
  BEFORE INSERT OR UPDATE ON public.activity_log
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_activity_log_freebrainer();

CREATE OR REPLACE FUNCTION public.validate_brainlover_notes_freebrainer()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.freebrainer_id) THEN
    RETURN NEW;
  END IF;
  IF EXISTS (SELECT 1 FROM public.managed_freebrainers WHERE id = NEW.freebrainer_id) THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'freebrainer_id % does not exist in auth.users or managed_freebrainers', NEW.freebrainer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS validate_brainlover_notes_freebrainer ON public.brainlover_notes;
CREATE TRIGGER validate_brainlover_notes_freebrainer
  BEFORE INSERT OR UPDATE ON public.brainlover_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_brainlover_notes_freebrainer();

CREATE OR REPLACE FUNCTION public.validate_brainlover_support_freebrainer()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.freebrainer_id) THEN
    RETURN NEW;
  END IF;
  IF EXISTS (SELECT 1 FROM public.managed_freebrainers WHERE id = NEW.freebrainer_id) THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'freebrainer_id % does not exist in auth.users or managed_freebrainers', NEW.freebrainer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS validate_brainlover_support_freebrainer ON public.brainlover_support;
CREATE TRIGGER validate_brainlover_support_freebrainer
  BEFORE INSERT OR UPDATE ON public.brainlover_support
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_brainlover_support_freebrainer();

SELECT 'Migration 28: FK constraints dropped, triggers retained for validation!' as status;
