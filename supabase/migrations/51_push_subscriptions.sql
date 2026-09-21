-- Migration 51: push_subscriptions table (Web Push v1)
-- One row per (user, device/browser). The Edge Function `send-push` reads
-- these with the service_role key; users manage only their own rows.
-- VAPID keys: public in .env (VITE_VAPID_PUBLIC_KEY), private ONLY in
-- Supabase Secrets (VAPID_PRIVATE_KEY). Never commit the private key.

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint     text NOT NULL,
  p256dh       text NOT NULL,
  auth         text NOT NULL,
  device_label text,
  created_at   timestamptz DEFAULT now(),
  UNIQUE (user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON public.push_subscriptions (user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Owner manages own subscriptions (subscribe/unsubscribe from the app)
DROP POLICY IF EXISTS "Users manage own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users manage own push subscriptions"
  ON public.push_subscriptions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

SELECT 'Migration 51: push_subscriptions!' as status;
