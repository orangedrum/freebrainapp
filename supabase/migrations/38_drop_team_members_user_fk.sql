-- ============================================================
-- Migration 38: Drop team_members.user_id FK to auth.users
--
-- Managed sub-account FreeBrainers live in managed_freebrainers,
-- NOT auth.users. The FK constraint on team_members.user_id blocks
-- them from joining teams. Drop the FK and add a validation trigger
-- that accepts IDs from either auth.users OR managed_freebrainers.
-- ============================================================

-- 1. Drop the FK constraint on team_members.user_id
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'team_members'
        AND constraint_type = 'FOREIGN KEY'
        AND constraint_name = 'team_members_user_id_fkey'
    ) THEN
        ALTER TABLE public.team_members DROP CONSTRAINT team_members_user_id_fkey;
    END IF;
END $$;

-- 2. Create a validation function that checks both tables
CREATE OR REPLACE FUNCTION public.validate_team_member_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Accept if the ID exists in auth.users
    IF EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.user_id) THEN
        RETURN NEW;
    END IF;

    -- Accept if the ID exists in managed_freebrainers
    IF EXISTS (SELECT 1 FROM public.managed_freebrainers WHERE id = NEW.user_id) THEN
        RETURN NEW;
    END IF;

    -- Reject — not a valid user or managed sub-account
    RAISE EXCEPTION 'user_id % does not exist in auth.users or managed_freebrainers', NEW.user_id;
END;
$$;

-- 3. Create the validation trigger
DROP TRIGGER IF EXISTS validate_team_member_user ON public.team_members;
CREATE TRIGGER validate_team_member_user
    BEFORE INSERT ON public.team_members
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_team_member_user();

-- 4. Also drop the FK on caregiver_links.patient_id if it still exists
--    (migration 29 may have already done this, but check again)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'caregiver_links'
        AND constraint_type = 'FOREIGN KEY'
        AND constraint_name = 'caregiver_links_patient_id_fkey'
    ) THEN
        ALTER TABLE public.caregiver_links DROP CONSTRAINT caregiver_links_patient_id_fkey;
    END IF;
END $$;
