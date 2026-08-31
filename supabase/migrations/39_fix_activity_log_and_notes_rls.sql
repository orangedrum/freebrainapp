-- 39_fix_activity_log_and_notes_rls.sql
--
-- Fix RLS recursion on activity_log and brainlover_notes tables.
-- Same root cause as migration 37: the RLS policies use EXISTS subqueries
-- on caregiver_links and managed_freebrainers, which themselves have RLS
-- enabled, causing infinite recursion → "new row violates row-level
-- security policy" errors.
--
-- Fix: Reuse the is_linked_brainlover SECURITY DEFINER function from
-- migration 37, which bypasses RLS to check the link.

-- ── 1. activity_log: drop ALL old policies ──
DROP POLICY IF EXISTS "BrainLovers can read activity_log" ON public.activity_log;
DROP POLICY IF EXISTS "BrainLovers can insert activity_log" ON public.activity_log;
DROP POLICY IF EXISTS "FreeBrainers can read own activity_log" ON public.activity_log;
DROP POLICY IF EXISTS "activity_log_insert" ON public.activity_log;
DROP POLICY IF EXISTS "activity_log_select" ON public.activity_log;
DROP POLICY IF EXISTS "activity_log_insert_managed" ON public.activity_log;
DROP POLICY IF EXISTS "activity_log_read_managed" ON public.activity_log;

-- ── 2. activity_log: recreate with SECURITY DEFINER function ──
CREATE POLICY "activity_log_insert"
  ON public.activity_log FOR INSERT
  TO authenticated
  WITH CHECK (public.is_linked_brainlover(freebrainer_id));

CREATE POLICY "activity_log_select"
  ON public.activity_log FOR SELECT
  TO authenticated
  USING (
    public.is_linked_brainlover(freebrainer_id)
    OR auth.uid() = freebrainer_id
  );

CREATE POLICY "activity_log_delete"
  ON public.activity_log FOR DELETE
  TO authenticated
  USING (public.is_linked_brainlover(freebrainer_id));

-- ── 3. brainlover_notes: drop ALL old policies ──
DROP POLICY IF EXISTS "BrainLovers can read brainlover_notes" ON public.brainlover_notes;
DROP POLICY IF EXISTS "BrainLovers can insert brainlover_notes" ON public.brainlover_notes;
DROP POLICY IF EXISTS "FreeBrainers can read own brainlover_notes" ON public.brainlover_notes;
DROP POLICY IF EXISTS "brainlover_notes_insert" ON public.brainlover_notes;
DROP POLICY IF EXISTS "brainlover_notes_select" ON public.brainlover_notes;
DROP POLICY IF EXISTS "brainlover_notes_insert_managed" ON public.brainlover_notes;
DROP POLICY IF EXISTS "brainlover_notes_read_managed" ON public.brainlover_notes;

-- ── 4. brainlover_notes: recreate with SECURITY DEFINER function ──
CREATE POLICY "brainlover_notes_insert"
  ON public.brainlover_notes FOR INSERT
  TO authenticated
  WITH CHECK (public.is_linked_brainlover(freebrainer_id));

CREATE POLICY "brainlover_notes_select"
  ON public.brainlover_notes FOR SELECT
  TO authenticated
  USING (
    public.is_linked_brainlover(freebrainer_id)
    OR auth.uid() = freebrainer_id
  );

CREATE POLICY "brainlover_notes_delete"
  ON public.brainlover_notes FOR DELETE
  TO authenticated
  USING (public.is_linked_brainlover(freebrainer_id));

SELECT 'Migration 39: activity_log + brainlover_notes RLS fixed with is_linked_brainlover!' as status;
