-- ============================================================
-- Migration 01: Caregiver Links & Teams Setup
-- Run in Supabase SQL Editor
-- Creates caregiver_links, teams, and team_members tables with RLS
-- ============================================================

-- 1. Create 'caregiver_links' table if it does not exist
CREATE TABLE IF NOT EXISTS public.caregiver_links (
    id UUID PRIMARY KEY DEFAULT gen_random_default(),
    caregiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(caregiver_id, patient_id)
);

-- Enable RLS and permissive policies for caregiver links
ALTER TABLE public.caregiver_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read caregiver_links" ON public.caregiver_links;
CREATE POLICY "Allow read caregiver_links" ON public.caregiver_links FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert caregiver_links" ON public.caregiver_links;
CREATE POLICY "Allow insert caregiver_links" ON public.caregiver_links FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete caregiver_links" ON public.caregiver_links;
CREATE POLICY "Allow delete caregiver_links" ON public.caregiver_links FOR DELETE USING (true);


-- 2. Create 'teams' table
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_default(),
    name TEXT NOT NULL,
    code TEXT,
    conditions TEXT[] DEFAULT ARRAY['Open Team']::TEXT[],
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS conditions TEXT[] DEFAULT ARRAY['Open Team']::TEXT[];
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. Create 'team_members' table
CREATE TABLE IF NOT EXISTS public.team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_default(),
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id)
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Drop ALL possible existing policies that might cause recursive loops
DO $$ 
DECLARE 
    pol RECORD;
BEGIN
    FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'team_members' AND schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.team_members', pol.policyname);
    END LOOP;
    FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'teams' AND schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.teams', pol.policyname);
    END LOOP;
END $$;

-- Simple, non-recursive policies for teams
CREATE POLICY "Allow public/authenticated read access to teams" 
ON public.teams FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to create teams" 
ON public.teams FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update teams" 
ON public.teams FOR UPDATE USING (true);

CREATE POLICY "Allow authenticated users to delete teams" 
ON public.teams FOR DELETE USING (true);

-- Simple, non-recursive policies for team_members (NO SUBQUERIES on team_members!)
CREATE POLICY "Allow read access to team_members" 
ON public.team_members FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to join teams" 
ON public.team_members FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow team members to leave teams" 
ON public.team_members FOR DELETE USING (true);

CREATE POLICY "Allow team members to update role" 
ON public.team_members FOR UPDATE USING (true);

-- Trigger to dissolve empty teams
CREATE OR REPLACE FUNCTION public.clean_empty_teams()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    DELETE FROM public.teams
    WHERE id NOT IN (SELECT DISTINCT team_id FROM public.team_members WHERE team_id IS NOT NULL);
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_clean_empty_teams ON public.team_members;
CREATE TRIGGER trigger_clean_empty_teams
AFTER DELETE OR UPDATE ON public.team_members
FOR EACH STATEMENT
EXECUTE FUNCTION public.clean_empty_teams();
