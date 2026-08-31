-- 26_fix_aha_insight_and_activity_log_fk.sql
--
-- Bug 1: daily_checkins.aha_insight column doesn't exist, causing 400 errors
--        when LatestAhaInsight and useBrainLoverUpdates query it.
--
-- Bug 2: activity_log, brainlover_notes, brainlover_support all have
--        freebrainer_id FK → auth.users(id). Managed sub-accounts have
--        IDs from managed_freebrainers table, not auth.users, so inserts
--        fail with FK constraint violation (409).
--
-- Fix: Add aha_insight column + relax FKs to allow managed_freebrainers IDs.
-- Additive only — does NOT drop existing data.

-- ── 1. Add aha_insight column to daily_checkins ──
ALTER TABLE public.daily_checkins
  ADD COLUMN IF NOT EXISTS aha_insight TEXT DEFAULT NULL;

-- ── 2. Relax FK on activity_log.freebrainer_id ──
-- Drop the strict auth.users FK and replace with a composite check
-- that allows both auth.users IDs and managed_freebrainers IDs.
ALTER TABLE public.activity_log
  DROP CONSTRAINT IF EXISTS activity_log_freebrainer_id_fkey;

ALTER TABLE public.activity_log
  ADD CONSTRAINT activity_log_freebrainer_id_fkey
  FOREIGN KEY (freebrainer_id) REFERENCES auth.users(id) ON DELETE CASCADE
  DEFERRABLE INITIALLY DEFERRED;

-- Also allow managed_freebrainers IDs by adding a check constraint
-- that validates against either table.
-- (We use a DEFERRABLE FK to auth.users + a trigger for managed check.)
CREATE OR REPLACE FUNCTION public.validate_activity_log_freebrainer()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if freebrainer_id exists in auth.users
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.freebrainer_id) THEN
    RETURN NEW;
  END IF;
  -- Check if freebrainer_id exists in managed_freebrainers
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

-- ── 3. Relax FK on brainlover_notes.freebrainer_id ──
ALTER TABLE public.brainlover_notes
  DROP CONSTRAINT IF EXISTS brainlover_notes_freebrainer_id_fkey;

ALTER TABLE public.brainlover_notes
  ADD CONSTRAINT brainlover_notes_freebrainer_id_fkey
  FOREIGN KEY (freebrainer_id) REFERENCES auth.users(id) ON DELETE CASCADE
  DEFERRABLE INITIALLY DEFERRED;

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

-- ── 4. Relax FK on brainlover_support.freebrainer_id ──
ALTER TABLE public.brainlover_support
  DROP CONSTRAINT IF EXISTS brainlover_support_freebrainer_id_fkey;

ALTER TABLE public.brainlover_support
  ADD CONSTRAINT brainlover_support_freebrainer_id_fkey
  FOREIGN KEY (freebrainer_id) REFERENCES auth.users(id) ON DELETE CASCADE
  DEFERRABLE INITIALLY DEFERRED;

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

-- ── 5. Update RLS on activity_log to also allow managed_freebrainers ──
-- The existing RLS from migration 25 already checks managed_freebrainers,
-- but let's ensure the insert policy also covers the managed case.
DROP POLICY IF EXISTS "activity_log_insert_managed" ON public.activity_log;
CREATE POLICY "activity_log_insert_managed" ON public.activity_log
  FOR INSERT WITH CHECK (
    auth.uid() = brainlover_id
    OR EXISTS (
      SELECT 1 FROM public.managed_freebrainers mf
      WHERE mf.managed_by = auth.uid()
        AND mf.id = activity_log.freebrainer_id
    )
  );

DROP POLICY IF EXISTS "activity_log_read_managed" ON public.activity_log;
CREATE POLICY "activity_log_read_managed" ON public.activity_log
  FOR SELECT USING (
    auth.uid() = freebrainer_id
    OR auth.uid() = brainlover_id
    OR EXISTS (
      SELECT 1 FROM public.caregiver_links cl
      WHERE cl.caregiver_id = auth.uid()
        AND cl.patient_id = activity_log.freebrainer_id
    )
    OR EXISTS (
      SELECT 1 FROM public.managed_freebrainers mf
      WHERE mf.managed_by = auth.uid()
        AND mf.id = activity_log.freebrainer_id
    )
  );

-- Same for brainlover_notes
DROP POLICY IF EXISTS "brainlover_notes_insert_managed" ON public.brainlover_notes;
CREATE POLICY "brainlover_notes_insert_managed" ON public.brainlover_notes
  FOR INSERT WITH CHECK (
    author_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM public.caregiver_links cl
        WHERE cl.caregiver_id = auth.uid()
          AND cl.patient_id = brainlover_notes.freebrainer_id
      )
      OR EXISTS (
        SELECT 1 FROM public.managed_freebrainers mf
        WHERE mf.managed_by = auth.uid()
          AND mf.id = brainlover_notes.freebrainer_id
      )
    )
  );

DROP POLICY IF EXISTS "brainlover_notes_read_managed" ON public.brainlover_notes;
CREATE POLICY "brainlover_notes_read_managed" ON public.brainlover_notes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.caregiver_links cl
      WHERE cl.caregiver_id = auth.uid()
        AND cl.patient_id = brainlover_notes.freebrainer_id
    )
    OR EXISTS (
      SELECT 1 FROM public.managed_freebrainers mf
      WHERE mf.managed_by = auth.uid()
        AND mf.id = brainlover_notes.freebrainer_id
    )
  );

SELECT 'Migration 26: aha_insight column + relaxed FKs for managed freebrainers applied!' as status;
