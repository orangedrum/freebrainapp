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

- [ ] **Step 0 (open): wire dead UI.** `session_notifications` table is
      written, never read — needs its first reader. Granular toggles persist
      but gate nothing (only the push channel toggle is live — it subscribes/
      unsubscribes real Web Push). Full prefs→Supabase migration lands with
      server-side sending.
- [x] **Step 1 (shipped): installability.** `vite-plugin-pwa`
      (injectManifest, `src/sw.ts`), PNG icons, `usePWAUpdate` mounted in
      `App`. If update behavior ever surprises: `src/hooks/usePWAUpdate.ts`
      owns ALL reloads; neither plugin nor SW may reload (see comments).
- [x] **Step 2 (shipped, needs deploy + live test): push.** VAPID pair
      generated 2026-09-21. PUBLIC key in `.env` (+ hosting env for prod
      builds). PRIVATE key ONLY in Supabase Secrets as `VAPID_PRIVATE_KEY`
      (+ `VAPID_PUBLIC_KEY`, `VAPID_SUBJECT`) — never in git, never
      client-side. Migration 51 (`push_subscriptions`), `send-push` Edge
      Function (deploy via Dashboard: paste
      `supabase/functions/send-push/index.ts`), SW push/click/badge handlers;
      `send-push` prunes dead (410/404) endpoints automatically.
- [ ] **Steps 3–4 (open): triggers + email.** Design notes: notify the
      SUPPORTER about streaks (bidirectional — freebrainer/brainlover, never
      age-assumed); payloads carry zero health content; quiet hours
      21:00–08:00 device-local; child's noisy channels default off. Needs:
      Resend API key as Supabase secret (auth mail already flows through the
      account — same vendor, new key).

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
