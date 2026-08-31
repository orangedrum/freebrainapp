# ADR-005: PWA Silent Update Strategy

## Status
Accepted

## Context
FreeBrain is installed as a PWA by non-technical, health-affected users. Traditional PWA update patterns (toast notifications, "Update available" banners) create confusion and anxiety. Worse, a silent reload during a check-in or post creation would lose user data and break trust. The app must stay current without user friction.

## Decision
Use **`vite-plugin-pwa` in `autoUpdate` mode** with a silent, deferred reload strategy:

- The service worker calls `skipWaiting()` automatically when a new version is detected — no user action needed.
- `usePWAUpdate` hook listens for `controllerchange` events and triggers `window.location.reload()`.
- **Deferral mechanism:** Before reloading, the hook checks `checkInProgressGlobal` (set by `CheckInFlow` during video playback and by `CreatePostModal` during post composition). If active, the reload is deferred.
- **Max deferral:** 60 seconds. If the user is still in a flow after 60s, the reload fires anyway to prevent indefinite staleness.
- **Visibility check:** Reloads only fire when the tab is visible (`document.visibilityState === "visible"`) to avoid reloading backgrounded PWAs.
- **No user-facing UI:** No toasts, banners, or prompts. The update is completely invisible.

## Consequences
- **Positive:** Users always have the latest code without knowing updates exist. No data loss during check-in or post creation. Zero cognitive load on non-technical users.
- **Negative:** Users never know when an update happened, making debugging harder ("is this the new version?"). The 60s max deferral could interrupt a very long post composition.
- **Mitigation:** Bundle version stamp (`[FB-STAMP]`) prints in console on every load for debugging. `CreatePostModal` sets the deferral flag, covering the longest user flow.
