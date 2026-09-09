-- ──────────────────────────────────────────────────────────────
-- Migration 42: Invite Directory — search existing FreeBrainers & BrainLovers
--
-- The invite dialogs (InviteTeammateModal, InviteFreeBrainerModal,
-- InviteBrainLoverChoiceModal) let a user search existing platform
-- accounts by NAME or EMAIL and connect directly, instead of sending
-- a second onboarding email to someone who already has an account.
--
--   search_users_for_invite  — substring search on name/email, returns
--     the user's display role (admin > pro > caregiver > freebrainer).
--     Used by the search box in every invite dialog.
--   lookup_user_by_email     — exact email match, single row. Used by
--     the smart invite to choose between a "join this team" email
--     (existing user) and an onboarding email (brand-new email).
--
-- Both are SECURITY DEFINER (like search_profiles, migration 41):
-- profiles RLS only lets users read their own row, and invites can be
-- sent before the sender verifies their own email. They expose only
-- the non-sensitive social columns (user_id, display_name, avatar_url)
-- plus the display role.
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.search_users_for_invite(search_query text)
RETURNS TABLE (user_id uuid, display_name text, avatar_url text, role text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id, display_name, avatar_url, role
  FROM (
    SELECT DISTINCT ON (p.user_id)
           p.user_id,
           p.display_name,
           p.avatar_url,
           COALESCE(ur.role, 'freebrainer') AS role
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.user_id
    LEFT JOIN public.user_roles ur ON ur.user_id = p.user_id
    ORDER BY p.user_id
  ) ranked
  WHERE display_name ILIKE '%' || search_query || '%'
     OR EXISTS (
          SELECT 1 FROM auth.users au
          WHERE au.id = ranked.user_id
            AND au.email ILIKE '%' || search_query || '%'
        )
  ORDER BY display_name
  LIMIT 8;
$$;

GRANT EXECUTE ON FUNCTION public.search_users_for_invite(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.lookup_user_by_email(target_email text)
RETURNS TABLE (user_id uuid, display_name text, avatar_url text, role text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT ON (p.user_id)
         p.user_id,
         p.display_name,
         p.avatar_url,
         COALESCE(ur.role, 'freebrainer') AS role
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.user_id
  LEFT JOIN public.user_roles ur ON ur.user_id = p.user_id
  WHERE lower(u.email) = lower(target_email)
  ORDER BY p.user_id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_user_by_email(text) TO anon, authenticated;