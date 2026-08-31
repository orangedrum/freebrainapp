-- ============================================================
-- Migration 03: BrainLover Community Posts Setup
-- Run in Supabase SQL Editor
-- Adds posting attribution columns to community_posts
-- ============================================================

-- 1. Add posting attribution columns to community_posts
ALTER TABLE public.community_posts 
ADD COLUMN IF NOT EXISTS on_behalf_of_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS posted_as_pro BOOLEAN DEFAULT FALSE;

-- 2. Update RLS policies to allow authenticated users to post
DROP POLICY IF EXISTS "Allow authenticated users to insert community posts" ON public.community_posts;
CREATE POLICY "Allow authenticated users to insert community posts" 
ON public.community_posts FOR INSERT WITH CHECK (true);

-- 3. Select policy for community posts
DROP POLICY IF EXISTS "Allow read access to community posts" ON public.community_posts;
CREATE POLICY "Allow read access to community posts" 
ON public.community_posts FOR SELECT USING (true);
