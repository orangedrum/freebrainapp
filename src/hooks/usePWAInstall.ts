/**
 * usePWAInstall — Platform detection + PWA install state hook.
 *
 * Detects:
 *  - Whether the app is already installed (standalone mode)
 *  - Whether the browser fired `beforeinstallprompt` (Android/Chrome)
 *  - The current platform (iOS, Android, Desktop)
 *
 * Exposes:
 *  - `canInstall` — true if native install prompt is available
 *  - `isInstalled` — true if app is running in standalone mode
 *  - `platform` — 'ios' | 'android' | 'desktop'
 *  - `promptInstall()` — triggers the native install prompt (Android/Chrome)
 *  - `shouldShowBanner()` — checks 3-day cooldown for the persistent banner
 *  - `markBannerDismissed()` — sets the cooldown timestamp
 *  - `markInstallShown()` — records that the user saw the install flow
 *
 * Tier 1 (localStorage) — per-device install state, no sensitive data.
 */

import { useState, useEffect, useCallback } from "react";

export type Platform = "ios" | "android" | "desktop";

// ── Capture beforeinstallprompt BEFORE React mounts ──
// The event can fire during initial page load, before useEffect runs.
// We stash it on window so the hook can pick it up.
if (typeof window !== "undefined") {
  (window as any).__fbDeferredPrompt = null;
  window.addEventListener("beforeinstallprompt", (e: Event) => {
    e.preventDefault();
    (window as any).__fbDeferredPrompt = e;
    console.log("[FB-DEBUG] beforeinstallprompt captured (pre-React)");
  });
}

const BANNER_COOLDOWN_KEY = "fb_pwa_banner_dismissed";
const INSTALL_SHOWN_KEY = "fb_pwa_install_shown";
const FORCE_INSTALL_KEY = "fb_pwa_force_install";
const COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000; // 3 days
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function detectPlatform(): Platform {
  const ua = navigator.userAgent || "";
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) {
    return "ios";
  }
  if (/Android/i.test(ua)) {
    return "android";
  }
  return "desktop";
}

function detectStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

export function usePWAInstall() {
  const [platform] = useState<Platform>(detectPlatform);
  const [isInstalled, setIsInstalled] = useState<boolean>(detectStandalone);
  const [justInstalled, setJustInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    // Pick up the event if it already fired before React mounted
    () => (window as any).__fbDeferredPrompt || null
  );
  // ── ?install=1 detection ──
  // When a user opens a magic link with ?install=1 (from the QR code or email),
  // we force the install prompt to show immediately — bypassing the 3-day cooldown.
  // We persist this in localStorage so it survives the page reload that happens
  // when onboarding completes and redirects to the dashboard.
  const [forceInstallPrompt, setForceInstallPrompt] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("install") === "1") {
      setForceInstallPrompt(true);
      // Persist so it survives the redirect after onboarding completes
      try { localStorage.setItem(FORCE_INSTALL_KEY, "1"); } catch {}
      // Clean the URL after a short delay so the onboarding page can read it
      setTimeout(() => {
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, "", cleanUrl);
      }, 100);
      console.log("[FB-DEBUG] install=1 detected — forcing install prompt");
    } else {
      // Check if a previous page set the force flag
      try {
        if (localStorage.getItem(FORCE_INSTALL_KEY) === "1") {
          setForceInstallPrompt(true);
        }
      } catch {}
    }
  }, []);

  // ── Auto-fire native install prompt when ?install=1 detected ──
  // On Android/Chrome, if beforeinstallprompt has fired, we automatically
  // trigger it so the user sees the system install dialog immediately.
  useEffect(() => {
    if (!forceInstallPrompt || !deferredPrompt || isInstalled) return;
    console.log("[FB-DEBUG] Auto-firing install prompt (install=1 + beforeinstallprompt ready)");
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choice: { outcome: "accepted" | "dismissed" }) => {
      console.log("[FB-DEBUG] Install prompt result:", choice.outcome);
      setDeferredPrompt(null);
      (window as any).__fbDeferredPrompt = null;
      // Clear the force flag after the prompt is resolved
      try { localStorage.removeItem(FORCE_INSTALL_KEY); } catch {}
    });
  }, [forceInstallPrompt, deferredPrompt, isInstalled]);

  // Listen for beforeinstallprompt (Android/Chrome) — also picks up pre-React capture
  useEffect(() => {
    // If the event was already captured before React mounted, use it
    if ((window as any).__fbDeferredPrompt && !deferredPrompt) {
      setDeferredPrompt((window as any).__fbDeferredPrompt);
    }
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      (window as any).__fbDeferredPrompt = e;
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [deferredPrompt]);

  // Detect if app was installed (display-mode changes) or fires appinstalled event
  useEffect(() => {
    const mq = window.matchMedia("(display-mode: standalone)");
    const handler = (e: MediaQueryListEvent) => {
      if (e.matches) {
        // Only celebrate if this is a NEW install (not already running standalone)
        if (!isInstalled) setJustInstalled(true);
        setIsInstalled(true);
      }
    };
    mq.addEventListener("change", handler);
    // Also listen for the explicit appinstalled event (Chrome/Android)
    const onInstalled = () => {
      setJustInstalled(true);
      setIsInstalled(true);
    };
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      mq.removeEventListener("change", handler);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [isInstalled]);

  // ── First-time standalone launch detection ──
  // When the app opens in standalone mode for the very first time,
  // show a celebratory "You did it!" message.
  useEffect(() => {
    if (!isInstalled) return;
    const FIRST_LAUNCH_KEY = "fb_pwa_first_launch_seen";
    try {
      if (!localStorage.getItem(FIRST_LAUNCH_KEY)) {
        setJustInstalled(true);
        localStorage.setItem(FIRST_LAUNCH_KEY, Date.now().toString());
      }
    } catch {}
  }, [isInstalled]);

  const dismissJustInstalled = useCallback(() => setJustInstalled(false), []);

  const canInstall = !!deferredPrompt && !isInstalled;

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    (window as any).__fbDeferredPrompt = null;
    // Clear the force flag after the user interacts with the prompt
    try { localStorage.removeItem(FORCE_INSTALL_KEY); } catch {}
    return choice.outcome === "accepted";
  }, [deferredPrompt]);

  const shouldShowBanner = useCallback((): boolean => {
    if (isInstalled) return false;
    // If ?install=1 was detected, always show — bypass cooldown
    if (forceInstallPrompt) return true;
    try {
      const dismissed = localStorage.getItem(BANNER_COOLDOWN_KEY);
      if (!dismissed) return true;
      const elapsed = Date.now() - parseInt(dismissed, 10);
      return elapsed >= COOLDOWN_MS;
    } catch {
      return true;
    }
  }, [isInstalled, forceInstallPrompt]);

  const markBannerDismissed = useCallback(() => {
    try {
      localStorage.setItem(BANNER_COOLDOWN_KEY, Date.now().toString());
      // Clear the force flag so it doesn't keep showing after dismissal
      localStorage.removeItem(FORCE_INSTALL_KEY);
    } catch {}
  }, []);

  const markInstallShown = useCallback(() => {
    try {
      localStorage.setItem(INSTALL_SHOWN_KEY, Date.now().toString());
      // Clear the force flag once the install flow has been shown
      localStorage.removeItem(FORCE_INSTALL_KEY);
    } catch {}
  }, []);

  const hasSeenInstallPrompt = useCallback((): boolean => {
    try {
      return !!localStorage.getItem(INSTALL_SHOWN_KEY);
    } catch {
      return false;
    }
  }, []);

  return {
    platform,
    isInstalled,
    canInstall,
    promptInstall,
    shouldShowBanner,
    markBannerDismissed,
    markInstallShown,
    hasSeenInstallPrompt,
    forceInstallPrompt,
    justInstalled,
    dismissJustInstalled,
  };
}
