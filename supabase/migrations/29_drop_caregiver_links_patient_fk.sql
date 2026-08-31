-- 29_drop_caregiver_links_patient_fk.sql
--
-- The caregiver_links.patient_id column has REFERENCES auth.users(id)
-- (from migration 01). Managed sub-account IDs live in managed_freebrainers,
-- NOT auth.users. So when a BrainLover invites another BrainLover to support
-- a managed sub-account FreeBrainer, the caregiver_links insert fails with
-- a FK violation — the link never gets created in Supabase.
--
-- Fix: Drop the FK on patient_id and replace it with a trigger that
-- validates against BOTH auth.users AND managed_freebrainers.

-- ── 1. Drop FK on caregiver_links.patient_id ──
ALTER TABLE public.caregiver_links
  DROP CONSTRAINT IF EXISTS caregiver_links_patient_id_fkey;

-- ── 2. Drop FK on caregiver_links.caregiver_id (BrainLovers may not have
--    verified email yet, so no auth.users row) ──
ALTER TABLE public.caregiver_links
  DROP CONSTRAINT IF EXISTS caregiver_links_caregiver_id_fkey;

-- ── 3. Create validation trigger ──
CREATE OR REPLACE FUNCTION public.validate_caregiver_links()
RETURNS TRIGGER AS $$
BEGIN
  -- patient_id must exist in auth.users OR managed_freebrainers
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.patient_id) THEN
    -- OK
  ELSIF EXISTS (SELECT 1 FROM public.managed_freebrainers WHERE id = NEW.patient_id) THEN
    -- OK
  ELSE
    RAISE EXCEPTION 'patient_id % does not exist in auth.users or managed_freebrainers', NEW.patient_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS validate_caregiver_links ON public.caregiver_links;
CREATE TRIGGER validate_caregiver_links
  BEFORE INSERT OR UPDATE ON public.caregiver_links
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_caregiver_links();

SELECT 'Migration 29: caregiver_links FK dropped, trigger validation added!' as status;
