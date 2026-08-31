-- ──────────────────────────────────────────────────────────────
-- 13_add_total_score_to_profiles.sql
--
-- Adds the `total_score` column to the `profiles` table.
-- The ScoreboardAndLeaderboards component reads/writes this
-- column to persist the user's FreeBrain score across devices.
-- Without it, Supabase returns 400 Bad Request on every
-- .select("total_score") and .update({ total_score: ... }) call.
-- ──────────────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS total_score INTEGER DEFAULT 420;

-- Backfill existing rows with the baseline score
UPDATE public.profiles
  SET total_score = 420
  WHERE total_score IS NULL;

-- Verify
SELECT count(*) as profiles_with_score
FROM public.profiles
WHERE total_score IS NOT NULL;
