/**
 * usePWAUpdate — Silent PWA auto-update with check-in protection.
 *
 * Strategy:
 *  1. vite-plugin-pwa is configured with `registerType: 'autoUpdate'`.
 *     When a new build is deployed, the SW fetches the new bundle and
 *     calls `skipWaiting()` to activate immediately, then triggers a
 *     page reload so the user gets the latest code.
 *  2. This hook intercepts that reload. If the user is mid-check-in,
 *     we DEFER the reload until the check-in completes.
 *  3. We also listen for `visibilitychange` (PWA returning to foreground)
 *     and manually trigger an SW update check — catching the "left the
 *     app open for 3 days" case.
 *
 * The user never sees a toast or notification. Updates are completely
 * silent. The only protection is that we won't reload mid-check-in.
 *
 * Usage:
 *   const { setCheckInProgress } = usePWAUpdate();
 *   // Call setCheckInProgress(true) when check-in starts,
 *   // setCheckInProgress(false) when it completes.
 */

import { useCallback, useEffect, useRef } from "react";

// Module-level flag so the SW message listener can read it
// even before React re-renders.
let checkInProgress = false;

export function setCheckInProgressGlobal(value: boolean) {
  checkInProgress = value;
  if (value) {
    console.log("[FB-DEBUG] PWA update: check-in in progress, deferring reload");
  }
}

export function usePWAUpdate() {
  const pendingReloadRef = useRef(false);

  const safeReload = useCallback(() => {
    console.log("[FB-DEBUG] PWA update: applying silent reload");
    window.location.reload();
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // ── 1. Intercept SW 'controllerchange' (autoUpdate triggers this) ──
    // When the new SW takes over via skipWaiting(), the controller changes.
    // This is our signal that a reload is pending.
    const handleControllerChange = () => {
      if (checkInProgress) {
        console.log("[FB-DEBUG] PWA update: new SW active but check-in in progress — deferring reload");
        pendingReloadRef.current = true;
      } else {
        safeReload();
      }
    };

    // Listen for controllerchange (fires when skipWaiting activates new SW)
    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    // ── 2. Intercept the plugin's virtual reload message ──
    // vite-plugin-pwa sends a message to the client when the SW is updated.
    // We intercept it to apply the same check-in protection.
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "SKIP_WAITING") {
        if (checkInProgress) {
          console.log("[FB-DEBUG] PWA update: SKIP_WAITING received but check-in in progress — deferring");
          pendingReloadRef.current = true;
        }
      }
    };
    navigator.serviceWorker.addEventListener("message", handleMessage);

    // ── 3. Check for updates when PWA returns to foreground ──
    // This catches the case where the user left the app open in the
    // background for hours/days. When they return, we ask the SW to
    // check for updates. If one is found, the controllerchange handler
    // will fire and either reload or defer.
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        navigator.serviceWorker.ready.then((registration) => {
          registration.update().catch((e) => {
            console.warn("[FB-DEBUG] PWA update check failed:", e);
          });
        });
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // ── 4. Poll for updates every 10 minutes while the app is open ──
    // Lightweight check — the SW only downloads if the hash changed.
    const pollInterval = setInterval(() => {
      if (document.visibilityState === "visible") {
        navigator.serviceWorker.ready.then((registration) => {
          registration.update().catch(() => {});
        });
      }
    }, 10 * 60 * 1000);

    // ── 5. Apply deferred reload when check-in completes ──
    // We poll the checkInProgress flag. If a reload was deferred and
    // check-in is now done, apply the reload.
    // Safety: force reload after 60 seconds regardless, to prevent deadlocks
    // where a stale SW blocks updates because the modal keeps re-opening.
    const deferredCheck = setInterval(() => {
      if (pendingReloadRef.current && !checkInProgress) {
        console.log("[FB-DEBUG] PWA update: check-in complete, applying deferred reload");
        pendingReloadRef.current = false;
        safeReload();
      }
    }, 2000);

    // ── 6. Max deferral timeout — force reload after 60s ──
    // Prevents infinite deadlock where stale code keeps re-opening the
    // check-in modal, which blocks the PWA update that would fix it.
    const maxDeferral = setTimeout(() => {
      if (pendingReloadRef.current) {
        console.log("[FB-DEBUG] PWA update: max deferral reached, forcing reload");
        pendingReloadRef.current = false;
        safeReload();
      }
    }, 60_000);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
      navigator.serviceWorker.removeEventListener("message", handleMessage);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(pollInterval);
      clearInterval(deferredCheck);
      clearTimeout(maxDeferral);
    };
  }, [safeReload]);

  // Expose a setter so components can flag check-in in progress
  const setCheckInProgress = useCallback((value: boolean) => {
    setCheckInProgressGlobal(value);
  }, []);

  return { setCheckInProgress };
}
