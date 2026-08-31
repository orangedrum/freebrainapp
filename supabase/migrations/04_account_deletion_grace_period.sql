-- ============================================================
-- Migration 04: Account Deletion Grace Period
-- Run in Supabase SQL Editor
-- Adds deletion_scheduled_at column to profiles for 48hr grace period
-- ============================================================

-- 1. Add the deletion_scheduled_at column to the profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS deletion_scheduled_at timestamp with time zone DEFAULT NULL;

-- 2. (Optional) If you want to automatically clean up these accounts later, 
-- you would typically use pg_cron or an Edge Function. 
-- For now, this column successfully tracks the 48-hour grace period state.
