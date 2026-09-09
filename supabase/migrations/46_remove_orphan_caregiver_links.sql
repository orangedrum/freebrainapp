-- ============================================================
-- Migration 46: Remove orphan caregiver_links (dead patients)
-- Run in Supabase SQL Editor
-- ============================================================
-- ROOT CAUSE: Some caregiver_links.patient_id values reference a
-- patient that no longer exists in auth.users, managed_freebrainers,
-- OR profiles (legacy rows from before the validation triggers were
-- added). The BrainLover dashboard was surfacing these ghosts
-- (fallback label "FreeBrainer"), and proxy check-ins were then
-- rejected by the validate_daily_checkin_user trigger:
--   user_id 8b7c3d60-... does not exist in auth.users or managed_freebrainers
--
-- FIX: Delete caregiver_links rows whose patient_id is not ANY known
-- identity. Safe to re-run. If a ghost should instead be reparented to
-- a live FreeBrainer, update patient_id first, then re-run this.
-- ============================================================

-- 1. Delete orphan links (patient is not in auth.users, managed_freebrainers, or profiles)
DELETE FROM public.caregiver_links cl
WHERE NOT EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id = cl.patient_id
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.managed_freebrainers m WHERE m.id = cl.patient_id
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.user_id = cl.patient_id
  );

-- 2. Verify: every remaining link points at a real identity
SELECT cl.caregiver_id, cl.patient_id,
       (p.user_id IS NOT NULL) AS has_profile,
       (m.id IS NOT NULL) AS has_managed_row
FROM public.caregiver_links cl
LEFT JOIN public.profiles p ON p.user_id = cl.patient_id
LEFT JOIN public.managed_freebrainers m ON m.id = cl.patient_id
ORDER BY cl.created_at;

SELECT 'Migration 46: orphan caregiver_links removed!' as status;