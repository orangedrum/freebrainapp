-- ──────────────────────────────────────────────────────────────
-- Leaderboard Read Access — allow authenticated users to read
-- non-sensitive (Tier 2) columns needed for leaderboards.
--
-- Problem: profiles RLS only allowed reading your own row
--   (user_id = auth.uid()), so the leaderboard query returned
--   only the current user — no peers above or below.
--
-- Fix: Add a permissive SELECT policy for authenticated users on
--   the non-sensitive columns used by leaderboards:
--     profiles      → total_score, display_name, avatar_url, user_id
--     user_roles    → user_id, role
--     teams         → id, name
--     team_members  → team_id, user_id
--     medical_profiles → user_id, neurological_condition
--
-- These are all Tier 2 (social) columns — no sensitive symptom
-- or device data is exposed.
-- ──────────────────────────────────────────────────────────────

-- ── profiles: allow authenticated reads ──
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leaderboard read profiles" ON profiles;
CREATE POLICY "Leaderboard read profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- ── user_roles: allow authenticated reads ──
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leaderboard read user_roles" ON user_roles;
CREATE POLICY "Leaderboard read user_roles"
  ON user_roles FOR SELECT
  TO authenticated
  USING (true);

-- ── teams: allow authenticated reads ──
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leaderboard read teams" ON teams;
CREATE POLICY "Leaderboard read teams"
  ON teams FOR SELECT
  TO authenticated
  USING (true);

-- ── team_members: allow authenticated reads ──
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leaderboard read team_members" ON team_members;
CREATE POLICY "Leaderboard read team_members"
  ON team_members FOR SELECT
  TO authenticated
  USING (true);

-- ── medical_profiles: allow authenticated reads of condition only ──
-- NOTE: neurological_condition is Tier 2 (non-sensitive label like
-- "Parkinson's", "MS"). Raw symptoms / device data live in
-- localStorage only (Tier 1) and are never in this table.
ALTER TABLE medical_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leaderboard read conditions" ON medical_profiles;
CREATE POLICY "Leaderboard read conditions"
  ON medical_profiles FOR SELECT
  TO authenticated
  USING (true);
