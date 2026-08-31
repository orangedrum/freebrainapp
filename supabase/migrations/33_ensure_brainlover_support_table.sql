-- 33_ensure_brainlover_support_table.sql
-- Ensures brainlover_support table exists with seen_at column.
-- Idempotent — safe to run multiple times.

-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.brainlover_support (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_brainlover_id uuid NOT NULL,
  to_brainlover_id uuid NOT NULL,
  freebrainer_id uuid,
  content varchar(40),
  created_at timestamptz DEFAULT now(),
  seen_at timestamptz
);

-- Add seen_at column if it doesn't exist (from migration 30)
ALTER TABLE public.brainlover_support
  ADD COLUMN IF NOT EXISTS seen_at timestamptz;

-- Index for unread badge queries
CREATE INDEX IF NOT EXISTS idx_brainlover_support_unread
  ON public.brainlover_support (to_brainlover_id, seen_at, created_at DESC);

-- RLS: enable
ALTER TABLE public.brainlover_support ENABLE ROW LEVEL SECURITY;

-- RLS: only the two BrainLovers involved can read
DROP POLICY IF EXISTS "brainlover_support_read" ON public.brainlover_support;
CREATE POLICY "brainlover_support_read" ON public.brainlover_support
  FOR SELECT USING (
    from_brainlover_id = auth.uid() OR to_brainlover_id = auth.uid()
  );

-- RLS: any linked BrainLover can insert
DROP POLICY IF EXISTS "brainlover_support_insert" ON public.brainlover_support;
CREATE POLICY "brainlover_support_insert" ON public.brainlover_support
  FOR INSERT WITH CHECK (from_brainlover_id = auth.uid());

-- RLS: only the recipient can mark messages as seen
DROP POLICY IF EXISTS "brainlover_support_update_seen" ON public.brainlover_support;
CREATE POLICY "brainlover_support_update_seen" ON public.brainlover_support
  FOR UPDATE USING (to_brainlover_id = auth.uid());
