-- ============================================================
-- Migration 15: Add metadata column to community_posts
-- Run in Supabase SQL Editor
-- Supports structured data for automated posts (e.g. team rank changes)
-- ============================================================

ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add 'team_rank_change' as a valid post type (no constraint to alter,
-- the type column is already free-text)
