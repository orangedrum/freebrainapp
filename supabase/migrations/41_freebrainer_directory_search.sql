-- ──────────────────────────────────────────────────────────────
-- Migration 41: FreeBrainer Directory Search
--
-- BrainLover onboarding step "Find your FreeBrainer" lets someone
-- search the whole platform by NAME or EMAIL and connect to an
-- existing FreeBrainer. The search happens BEFORE the searcher
-- verifies their own email (magic-link auth is the final step),
-- so it must be callable by BOTH anonymous and authenticated users.
--
-- profiles RLS only allows authenticated reads (migration 17), so
-- this uses a SECURITY DEFINER function. It exposes only the
-- non-sensitive social columns: user_id, display_name, avatar_url.
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.search_profiles(search_query text)
RETURNS TABLE (user_id uuid, display_name text, avatar_url text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.display_name, p.avatar_url
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.user_id
  WHERE (p.display_name ILIKE '%' || search_query || '%'
      OR u.email ILIKE '%' || search_query || '%')
    AND (auth.uid() IS NULL OR p.user_id <> auth.uid())
  ORDER BY p.display_name
  LIMIT 5;
$$;

GRANT EXECUTE ON FUNCTION public.search_profiles(text) TO anon, authenticated;