-- ============================================================
-- Migration 02: Managed Sub-Accounts & Bulk Invite Support
-- Run in Supabase SQL Editor
-- Adds managed_by columns, managed_freebrainers table, and managed_checkins
-- ============================================================

-- 1. Add 'managed_by' column to profiles (Pro manages no-email FreeBrainers)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS managed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_managed BOOLEAN DEFAULT false;

-- 2. Add 'status' column to caregiver_links (for pending/active/managed links)
ALTER TABLE public.caregiver_links ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- 3. RLS: Allow users to read/manage profiles they manage
DROP POLICY IF EXISTS "Users can read managed profiles" ON public.profiles;
CREATE POLICY "Users can read managed profiles" 
ON public.profiles FOR SELECT 
USING (auth.uid() = managed_by OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert managed profiles" ON public.profiles;
CREATE POLICY "Users can insert managed profiles" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = managed_by OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update managed profiles" ON public.profiles;
CREATE POLICY "Users can update managed profiles" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = managed_by OR auth.uid() = user_id);

-- 4. Allow caregiver_links to reference managed (non-auth) profiles
ALTER TABLE public.caregiver_links DROP CONSTRAINT IF EXISTS caregiver_links_patient_id_fkey;
ALTER TABLE public.caregiver_links DROP CONSTRAINT IF EXISTS caregiver_links_caregiver_id_fkey;

ALTER TABLE public.caregiver_links 
  ADD CONSTRAINT caregiver_links_caregiver_id_fkey 
  FOREIGN KEY (caregiver_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.caregiver_links 
  ADD CONSTRAINT caregiver_links_patient_id_fkey 
  FOREIGN KEY (patient_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 5. Create 'managed_freebrainers' table for sub-accounts without auth
CREATE TABLE IF NOT EXISTS public.managed_freebrainers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    managed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    conditions TEXT,
    location TEXT,
    diagnosis_story TEXT,
    share_consent BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.managed_freebrainers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Pros can read their managed freebrainers" ON public.managed_freebrainers;
CREATE POLICY "Pros can read their managed freebrainers" 
ON public.managed_freebrainers FOR SELECT 
USING (auth.uid() = managed_by);

DROP POLICY IF EXISTS "Pros can insert their managed freebrainers" ON public.managed_freebrainers;
CREATE POLICY "Pros can insert their managed freebrainers" 
ON public.managed_freebrainers FOR INSERT 
WITH CHECK (auth.uid() = managed_by);

DROP POLICY IF EXISTS "Pros can update their managed freebrainers" ON public.managed_freebrainers;
CREATE POLICY "Pros can update their managed freebrainers" 
ON public.managed_freebrainers FOR UPDATE 
USING (auth.uid() = managed_by);

DROP POLICY IF EXISTS "Pros can delete their managed freebrainers" ON public.managed_freebrainers;
CREATE POLICY "Pros can delete their managed freebrainers" 
ON public.managed_freebrainers FOR DELETE 
USING (auth.uid() = managed_by);

-- 6. Link managed freebrainers to caregiver_links
ALTER TABLE public.caregiver_links DROP CONSTRAINT IF EXISTS caregiver_links_patient_id_fkey;

CREATE OR REPLACE FUNCTION public.validate_caregiver_link_patient()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.patient_id) THEN
        RETURN NEW;
    END IF;
    IF EXISTS (SELECT 1 FROM public.managed_freebrainers WHERE id = NEW.patient_id) THEN
        RETURN NEW;
    END IF;
    RAISE EXCEPTION 'patient_id must reference auth.users or managed_freebrainers';
END;
$$;

DROP TRIGGER IF EXISTS validate_caregiver_link_patient ON public.caregiver_links;
CREATE TRIGGER validate_caregiver_link_patient
BEFORE INSERT OR UPDATE ON public.caregiver_links
FOR EACH ROW
EXECUTE FUNCTION public.validate_caregiver_link_patient();

-- 7. Allow daily_checkins to reference managed freebrainers
ALTER TABLE public.daily_checkins DROP CONSTRAINT IF EXISTS daily_checkins_user_id_fkey;
ALTER TABLE public.daily_checkins 
  ADD CONSTRAINT daily_checkins_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create a parallel table for managed checkins
CREATE TABLE IF NOT EXISTS public.managed_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    managed_freebrainer_id UUID NOT NULL REFERENCES public.managed_freebrainers(id) ON DELETE CASCADE,
    checked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    checkin_date DATE NOT NULL,
    checkin_status TEXT DEFAULT 'moved',
    points_earned INT DEFAULT 10,
    movement_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(managed_freebrainer_id, checkin_date)
);

ALTER TABLE public.managed_checkins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Pros can read managed checkins" ON public.managed_checkins;
CREATE POLICY "Pros can read managed checkins" 
ON public.managed_checkins FOR SELECT USING (true);

DROP POLICY IF EXISTS "Pros can insert managed checkins" ON public.managed_checkins;
CREATE POLICY "Pros can insert managed checkins" 
ON public.managed_checkins FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Pros can update managed checkins" ON public.managed_checkins;
CREATE POLICY "Pros can update managed checkins" 
ON public.managed_checkins FOR UPDATE USING (true);

SELECT 'Managed sub-accounts schema ready!' as status;
