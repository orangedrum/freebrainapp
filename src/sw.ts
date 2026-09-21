/// <reference lib="webworker" />
/**
 * FreeBrain service worker (injectManifest strategy).
 *
 * - Precaches the app shell (injected manifest), cleans outdated caches.
 * - skipWaiting + clientsClaim: new builds activate immediately; the page
 *   reload itself stays owned by usePWAUpdate (silent, deferred during
 *   check-in video / post creation). This file must NEVER reload clients.
 * - push: renders sender-composed notifications. Payloads MUST stay
 *   health-free ("Time to move!", names, counts) — never symptoms,
 *   streak-as-medical-data, or clinical content (Tier-1 rule).
 * - notificationclick: focuses/opens the payload URL, clears the badge.
 */
import { cleanupOutdatedCaches, precacheAndRoute, createHandlerBoundToURL } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { clientsClaim } from "workbox-core";

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
registerRoute(new NavigationRoute(createHandlerBoundToURL("index.html")));

self.skipWaiting();
clientsClaim();

interface PushPayload {
  title?: string;
  body?: string;
  /** Deep link opened on tap. Defaults to "/". */
  url?: string;
  /** Groups/replaces notifications with the same tag. */
  tag?: string;
  /** App-icon badge count. Omit to leave the badge untouched. */
  badgeCount?: number;
}

self.addEventListener("push", (event: PushEvent) => {
  let data: PushPayload = {};
  try {
    data = (event.data?.json() as PushPayload) ?? {};
  } catch {
    /* unparseable payload — show a generic nudge */
  }
  const url = data.url || "/";
  event.waitUntil(
    (async () => {
      try {
        if (
          typeof data.badgeCount === "number" &&
          "setAppBadge" in navigator
        ) {
          await (navigator as unknown as { setAppBadge: (n: number) => Promise<void> }).setAppBadge(
            Math.max(0, data.badgeCount)
          );
        }
      } catch {
        /* badging unsupported — notification still shows */
      }
      await self.registration.showNotification(data.title || "FreeBrain", {
        body: data.body || "",
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        tag: data.tag,
        data: { url },
      });
    })()
  );
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const url = (event.notification.data as { url?: string } | undefined)?.url || "/";
  event.waitUntil(
    (async () => {
      try {
        if ("clearAppBadge" in navigator) {
          await (navigator as unknown as { clearAppBadge: () => Promise<void> }).clearAppBadge();
        }
      } catch {
        /* ignore */
      }
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of windows) {
        const windowClient = client as WindowClient;
        if (windowClient.url.startsWith(self.location.origin) && "focus" in windowClient) {
          await windowClient.focus();
          try {
            await windowClient.navigate(url);
          } catch {
            /* cross-origin navigation blocked — focus is enough */
          }
          return;
        }
      }
      await self.clients.openWindow(url);
    })()
  );
});
