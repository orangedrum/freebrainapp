# Maintenance Backlog — known debt + future triggers

> Purpose: when something is deferred with a "revisit when X", it lands here
> with the exact trigger. Review this file before each release.
> Rule: each entry states WHERE, WHY deferred, and WHEN to act.

## PWA / bundle

- [ ] **Code-split the app-shell bundle.** `vite.config.ts` sets Workbox
      `maximumFileSizeToCacheInBytes: 4MB` because the shell is ~2.3MB
      (single 2.2MB JS chunk). Revisit when: bundle passes ~3MB, install
      conversion matters, or first paint regresses. Fix shape: route-level
      `React.lazy` splits + `manualChunks` for vendor.
- [ ] **Verify zero `forwardRef` warnings in PROD builds.** Dev console shows
      ~27 "Function components cannot be given refs" warnings. Cause: the
      dev-only `componentTagger` HOC (vite.config, development mode only)
      wraps components without forwarding refs. Expected absent in
      production builds. Revisit when: warnings appear in a prod build —
      then it's a real Radix/React-version mismatch, not the tagger.
- [ ] **Cookiebot 404 on localhost.** The consent CDN rejects unauthorized
      domains in dev. Harmless locally. Revisit when: it fires in production
      (add the domain in Cookiebot Manager) or consider gating the script
      tag in `index.html` to production hosts only.
- [ ] **`FB_BUNDLE_VERSION` stamping.** AGENTS.md claims the bundle version
      is stamped/logged in `src/main.tsx`; it isn't. Add when: debugging
      stale-client reports (lets support ask "what bundle are you on?").

## Onboarding (parent/child v1 — shipped)

- [ ] **Adopt or delete the onboarding state machine.** `src/lib/onboardingStateMachine.ts`
      + `src/features/onboarding/useOnboardingSubmit.ts`-adjacent
      `useOnboardingStateMachine.ts` are untracked/experimental and imported
      nowhere — all flows are step-number driven. Decide: migrate flows onto
      it, or delete both files. Revisit when: next onboarding change.
- [ ] **`StepConfirmation` dead "Are you ready?" branch.** Gated on
      `step === 12`, never rendered (flow renders it at 13). Keep until a
      pre-movement hype screen is wanted, then wire or delete.
- [ ] **Consent receipt persistence.** The parent's consent checkbox
      (`StepConsent`) gates flow but writes no timestamp/method/policy-version
      anywhere. Required before any regulator conversation. Revisit when:
      legal review starts (needs attorney-approved copy + versioning).
- [ ] **caregiver_links self-link guard.** Nothing stops
      `caregiver_id === patient_id` rows (seen in test data). Add a check in
      `ensureInvitedCaregiverLink` + completion paths. Revisit when: touching
      link creation next.

## Notifications program (steps 0–4)

- [x] **Step 0 (part 1, shipped 2026-09-21): session reader.** First reader
      of `session_notifications`: `useSessionNotifications` hook +
      `SessionInviteBanner` on both dashboards, refresh on foreground +
      `fb-session-notify` event, dismiss marks read. Honors the
      `sessionReminders` granular toggle — the first preference that gates
      something real.
- [x] **Step 0 (part 2a, shipped): prefs gate interruptions, never content.**
      `BrainLoverSOSAlert` honors `freebrainerSOS`. Deliberately NOT gated:
      check-in auto-open modal (it's the only opener — gating it would strand
      users with no way to check in); dashboard content, pages, Wall, data
      displays. Orphan banners `TeamRallyBanner` + `BrainLoverAlertsBanner`
      were never mounted anywhere (built, never wired — mounting them is a
      product/layout decision, not a prefs task); their future toggles
      (`teamRallies`, `sosAlerts`, `pokes`, `cheers`, `videoRecommendations`)
      apply when/if they mount, plus push/email versions in steps 3–4.
- [x] **Step 1 (shipped): installability.** `vite-plugin-pwa`
      (injectManifest, `src/sw.ts`), PNG icons, `usePWAUpdate` mounted in
      `App`. If update behavior ever surprises: `src/hooks/usePWAUpdate.ts`
      owns ALL reloads; neither plugin nor SW may reload (see comments).
- [x] **Step 2 (shipped, verifying live): push.** VAPID pair
      generated 2026-09-21. PUBLIC key in `.env` (+ hosting env for prod
      builds). PRIVATE key ONLY in Supabase Secrets as `VAPID_PRIVATE_KEY`
      (+ `VAPID_PUBLIC_KEY`, `VAPID_SUBJECT`) — never in git, never
      client-side. Migration 51 (`push_subscriptions`), `send-push` Edge
      Function (deploy via Dashboard), SW push/click/badge handlers;
      `send-push` prunes dead (410/404) endpoints automatically.
      Client fan-out wired 2026-09-30 (`pushNotify`: cheer/poke/video/
      teammate-cheer/SOS/rally invoke send-push fire-and-forget).
      Push toggle reconciles against real subscription state on load (a
      default-ON toggle with no subscription lies — fixed).
      Preference gating (step 3): `send-push` now reads `notification_prefs`
      server-side and drops recipients whose `channels.push` is off or whose
      tag→toggle is off. Tag→toggle map lives in `send-push/index.ts` and
      MIRRORS `ROLE_TOGGLE_DEFS` in `src/lib/notificationPreferences.ts` —
      keep the two in sync when adding a toggle. Missing prefs row = allowed
      (never silently mutes an undiscovered user).
      OPEN HARDENING: `send-push` accepts any authenticated caller — add JWT
      role checks + rate limiting before public launch; push copy is
      English-only (localize via profiles.locale in function later).
- [x] **Step 3 (shipped): triggers.** Server-side scheduling so sends fire
      with the phone closed — Web Push alone cannot (needs a signed-in client).
      `notification_prefs` (migration 53) is the server-readable toggle store;
      the client mirrors localStorage to it via `notificationPrefsSync`
      (hydrate on mount, fire-and-forget upsert on every change; timezone
      captured only when the editor owns the row). `DashboardLayout` also
      calls `syncNotificationMeta` on load so role+timezone exist even if the
      user never opens settings. Migration 54 adds
      `virtual_sessions.reminder_sent_at`, a `notification_deliveries` dedupe
      ledger, and a pg_cron job (every 5 min → pg_net → Edge Function
      `send-scheduled-notifications`). Three jobs: **session T-15** (≤15 min
      before a session, both people, `sessionReminders`), **morning nudge**
      (08:00–10:00 local, freebrainer not checked in, `checkinReminders`),
      **streak-at-risk** (17:00–20:00 local, freebrainer moved yesterday but
      not today → linked supporters, `freebrainerStreaks`). Quiet hours
      21:00–08:00 recipient-local; delivery deduped per (kind, recipient,
      local-day). Test mode is behind the `FB_NOTIFY_TEST_TOKEN` secret
      (`x-fb-test-token` header) and DISABLED when unset.
      DEPLOY ORDER: function before migration 54. Cron sends the public anon
      key (idempotent per-day, so worst case is the normal daily send);
      add a shared secret before public launch.
- [ ] **Step 4 (open): email.** Needs Resend API key as a Supabase secret
      (auth mail already flows through the account — same vendor, new key).
      `notification_prefs.channels.email` already exists (default OFF) and is
      the switch; the pure-prefs half of step 4 shipped early inside step 3.

### Reciprocity (deferred — deliberately unbuilt)

"Reciprocity" was listed as a step-3 item but is UNDEFINED in the product:
there are zero code/docs/locale hits for it. Do NOT invent behavior. Recorded
here so the eventual definition has a home.

What it most likely means: a two-way encouragement loop — the FreeBrainer's
own movement triggers a thank-you/acknowledgement back to the supporter who
cheered/poked/rallied, so the relationship is mutual rather than one-way.
Candidate shape (all speculation until product confirms):

- **Trigger:** a supporter (caregiver) interacts (poke/cheer/video/rally) and
  the FreeBrainer then completes a check-in.
- **Send:** one gentle "your nudge helped — they moved today" push/event to
  that supporter, deduped per (support, day).
- **Pieces that already exist and could be reused:** `brainloverInteractions.ts`
  (records pokes/cheers), `pushNotify.ts` (`notifyPush` + copy builders),
  `send-push` (delivery + `notification_prefs` gating), `caregiver_links`
  (who supports whom), `daily_checkins` (did they move).
- **Open questions to resolve before building:** Is it a push or in-app only?
  Which toggle gates it (no key exists today — needs a new `ROLE_TOGGLE_DEFS`
  entry + locale strings in all 5 files)? Does it reveal health data to the
  supporter (it must NOT — payloads stay health-free)? Supporter-local quiet
  hours vs FreeBrainer-local? Rate-limit so a supporter isn't pinged for every
  single check-in?

If/when defined, implement it as another job in
`send-scheduled-notifications` (or an event hook in `pushNotify`) rather than a
new parallel pipeline, and add its toggle key to the `send-push`
tag→toggle map.

### Scheduled-notifications runbook (re-verify anytime)

Test push end-to-end without waiting for a time window. Project:
`omcbwbhtjrozbgvzqdya.supabase.co` (anon key = the one in `src/lib/supabase.ts`).

1. Confirm cron is registered + firing (SQL Editor):
   ```sql
   select jobname, schedule, active from cron.job where jobname='fb-scheduled-notifications';
   select status, return_message, start_time from cron.job_run_details order by start_time desc limit 10;
   ```
2. Make the FreeBrainer "moved yesterday, not today" so streak + morning match:
   ```sql
   delete from daily_checkins where user_id='<FB_UID>' and checkin_date=current_date;
   insert into daily_checkins (user_id, checkin_date, moved, checkin_status)
   values ('<FB_UID>', current_date - 1, true, 'moved')
   on conflict do nothing;
   select caregiver_id, patient_id from caregiver_links;       -- supporter link must exist
   select user_id, count(*) from push_subscriptions group by user_id;  -- both people must subscribe
   ```
3. Force-run the scheduler (secret `FB_NOTIFY_TEST_TOKEN`, header `x-fb-test-token`):
   ```sql
   select net.http_post(
     url := 'https://omcbwbhtjrozbgvzqdya.supabase.co/functions/v1/send-scheduled-notifications',
     headers := jsonb_build_object(
       'Content-Type','application/json',
       'apikey','<ANON_KEY>', 'Authorization','Bearer <ANON_KEY>',
       'x-fb-test-token','<FB_NOTIFY_TEST_TOKEN>'
     ),
     body := '{}'::jsonb
   ) as request_id;
   select status_code, content, error_msg from net._http_response order by created desc limit 3;
   ```
   Expected `{"ok":true,"force":true,...}`. Force ignores windows, quiet hours
   and dedupe; `notification_deliveries` stays empty (by design) so you can
   re-run freely. Force does NOT stamp `virtual_sessions.reminder_sent_at`.
4. Delivery count for a single send (proves gating too — expect `sent:1,
   filtered:0` when the relevant toggle is ON, and `sent:0, filtered:1` when OFF):
   ```sql
   select net.http_post(
     url := 'https://omcbwbhtjrozbgvzqdya.supabase.co/functions/v1/send-push',
     headers := jsonb_build_object(
       'Content-Type','application/json',
       'apikey','<ANON_KEY>', 'Authorization','Bearer <ANON_KEY>'
     ),
     body := jsonb_build_object('user_id','<FB_UID>','title','FreeBrain',
       'body','Delivery check','tag','poke','toggle','pokes')
   ) as request_id;
   ```
   Then `select status_code, content from net._http_response order by created desc limit 1;`
   (`filtered` counts recipients whose prefs blocked the send.)

### Known bug (fixed in code, ship pending): supporter clobbers FreeBrainer's push setting

- **Symptom:** FreeBrainer enables push on their own profile; when the
  BrainLover opens the FreeBrainer's profile → Notifications, the push toggle
  shows OFF — and that OFF gets written to the DB.
- **Cause (2026-10-09):** `NotificationPreferences` is shared across roles and
  ran its device-push reconcile (`getPushState()`) against the **viewer's**
  browser. For a supporter viewing a patient's row that read "subscribed? no"
  → flip to false and persist. It also let a supporter's device subscribe *as*
  the FreeBrainer.
- **Fix:** `NotificationPreferences` now compares `userId` to the signed-in
  user (`useAuth`). Only the true owner reconciles push against their browser
  and can toggle the push subscription; proxy editors only edit the stored
  preference (timezone was already owner-only).
- **To re-open the table to verify after this ships:** `select user_id, channels,
  toggles, timezone from notification_prefs;` — a FreeBrainer's row should keep
  `channels.push: true` after the BrainLover views their profile.

## Test-data hygiene (dev only)

- Deleting `auth.users` orphans `public.*` rows (profiles, roles, links,
  invites) and poisons invite/check-in recovery lookups. Always clean with
  the full-ordered DO-block script (public tables first, `auth.users` last;
  `spared` array for keeper aliases). See `docs/test-accounts.md` for the
  alias conventions.

## Preview deployments (Vercel)

- Vercel **Deployment Protection (SSO wall)** on preview URLs breaks PWA
  verification AND real-user testing: manifest fetches 302 to `/login`
  ("No manifest detected"), and anyone without a Vercel login (i.e. every
  tester, every magic-link clicker) hits the wall instead of the app.
  Keep protection OFF on the branch under test, or test install/push on
  the production domain. Decided 2026-09-21 after a full false-alarm
  installability investigation (code was correct; the wall was not).
- Verified 2026-09-21: prod PWA installs cleanly from full Chrome (step 1
  closed). Beware stale preview URLs (immutable per deploy) — always verify
  against the newest deployment.

## In-app (mini) browsers — open item

- Magic-link openers land in Gmail/WebView mini-browsers: no install possible
  there, push limited, and no nontechnical user (tremor, brain injury, or
  otherwise) should ever have to know what "open in full Chrome" means.
  Planned: UA-based detection (`wv` token, missing beforeinstallprompt) →
  warm plain-language banner with a one-tap "Open in Chrome" deep-link, while
  keeping FULL functionality inside the mini-browser (no dead ends, no
  install nags). No user education as a strategy, ever.

## Tabled bugs (reported, deferred deliberately)

- **Recommended-videos flow bug** (reported 2026-09-23 during alerts testing;
  distinct flow from poke/cheer/dismiss). Revisit AFTER alerts (push live +
  dismiss verified) — reporter asked to be reminded at that point.
