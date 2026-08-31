-- ============================================================
-- Migration 16: Add movement metrics to daily_checkins
-- Run in Supabase SQL Editor
--
-- The SymptomMovementChart reads duration_minutes and movement_type
-- from daily_checkins, but these columns were never created.
-- This migration adds them so check-in submissions can store
-- the user's selected movement time and type.
--
-- Tier 2 (social) data only — no sensitive health data.
-- ============================================================

ALTER TABLE public.daily_checkins
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 0;

ALTER TABLE public.daily_checkins
  ADD COLUMN IF NOT EXISTS movement_type TEXT DEFAULT NULL;

-- Backfill existing rows with a reasonable default so the chart
-- isn't empty for users with past check-ins
UPDATE public.daily_checkins
  SET duration_minutes = 20
  WHERE duration_minutes = 0
    AND moved = true;
