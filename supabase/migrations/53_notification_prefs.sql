-- ──────────────────────────────────────────────────────────────
-- Migration 53: notification_prefs (server-readable notification toggles)
--
-- Until now, notification toggles lived ONLY in the recipient's browser
-- localStorage (src/lib/notificationPreferences.ts). A push is sent by a
-- DIFFERENT device (the BrainLover's phone nudging the FreeBrainer), so the
-- sender — and the send-push Edge Function — could never read the
-- recipient's choices. Every granular toggle was therefore decorative for
-- push; the only real opt-in was "is there a push_subscriptions row".
--
-- This table makes the toggles readable server-side so send-push can honor
-- them per recipient. It is the storage half of step 4 (notification_prefs),
-- pulled forward because step 3's scheduled sends must respect settings.
--
-- Privacy: pure delivery preferences — NO health data. RLS:
--   • a user fully manages their own row
--   • a linked supporter (caregiver_links) manages their FreeBrainer's row
--     (the BrainLover "Them" profile tab edits the FreeBrainer's toggles)
--   • service_role (send-push) bypasses RLS by design
--
-- A MISSING row means "everything ON" (matches the client defaults), so no
-- existing user is silently muted by this migration.
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.notification_prefs (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- The role whose toggle set applies (freebrainer | brainlover | pro | admin).
  -- send-push uses this to map a push tag → the right toggle key.
  role       TEXT,
  -- IANA zone (e.g. "Europe/Berlin") from the user's device. Enables
  -- device-local quiet hours (21:00–08:00) and the morning-nudge window.
  -- NULL = unknown → time-windowed sends are skipped for this user.
  timezone   TEXT,
  -- Master channels: {"inApp": true, "push": true, "email": false}
  channels   JSONB NOT NULL DEFAULT '{"inApp": true, "push": true, "email": false}'::jsonb,
  -- Granular toggles keyed by the role's ROLE_TOGGLE_DEFS keys,
  -- e.g. {"pokes": true, "freebrainerStreaks": false}
  toggles    JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_prefs ENABLE ROW LEVEL SECURITY;

-- Owner manages their own preferences.
DROP POLICY IF EXISTS "Users manage own notification prefs" ON public.notification_prefs;
CREATE POLICY "Users manage own notification prefs"
  ON public.notification_prefs FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- A linked supporter manages their FreeBrainer's preferences
-- (caregiver_id = me AND patient_id = the preference owner).
DROP POLICY IF EXISTS "Linked supporters manage notification prefs" ON public.notification_prefs;
CREATE POLICY "Linked supporters manage notification prefs"
  ON public.notification_prefs FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.caregiver_links cl
      WHERE cl.caregiver_id = auth.uid()
        AND cl.patient_id = notification_prefs.user_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.caregiver_links cl
      WHERE cl.caregiver_id = auth.uid()
        AND cl.patient_id = notification_prefs.user_id
    )
  );

SELECT 'Migration 53: notification_prefs ready!' as status;
