-- ============================================================
-- Migration 14: Add team slogan + image_url columns
-- Run in Supabase SQL Editor
-- Adds optional slogan and image_url to the teams table
-- ============================================================

ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS slogan TEXT;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS image_url TEXT;

-- RLS already allows authenticated users to update teams (migration 01),
-- so no policy changes needed.
