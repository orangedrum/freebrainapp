/**
 * pushSubscriptions — Web Push subscribe/unsubscribe + badge hygiene.
 *
 * One row per (user, browser) in `push_subscriptions` (migration 51).
 * The Edge Function `send-push` reads those rows server-side; this module
 * only ever touches the CURRENT user's own rows (RLS enforced).
 */
import { supabase, safeSupabaseQuery } from "@/lib/supabase";

function vapidPublicKey(): string | null {
  const key = (import.meta as any).env?.VITE_VAPID_PUBLIC_KEY as string | undefined;
  return key && key !== "REPLACE_WITH_VAPID_PUBLIC_KEY" ? key : null;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const output = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return "";
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return window.btoa(binary);
}

/** serviceWorker.ready with a timeout — in dev (no SW registered) the
 *  promise never settles, and we must not hang the UI forever. */
async function readyRegistration(timeoutMs = 8000): Promise<ServiceWorkerRegistration> {
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("service worker not ready")), timeoutMs)
    ),
  ]) as Promise<ServiceWorkerRegistration>;
}

/** 'unsupported' | 'denied' | 'subscribed' | 'off' */
export async function getPushState(): Promise<string> {
  if (!isPushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  try {
    const registration = await readyRegistration(4000);
    const subscription = await registration.pushManager.getSubscription();
    return subscription ? "subscribed" : "off";
  } catch {
    return "off";
  }
}

/**
 * Request permission (if needed), subscribe with the VAPID key, and persist
 * the subscription. Returns true when push is live for this browser.
 */
export async function subscribePush(userId: string): Promise<boolean> {
  if (!isPushSupported() || !userId) return false;
  const vapidKey = vapidPublicKey();
  if (!vapidKey) {
    console.warn("[FB-DEBUG] subscribePush: VITE_VAPID_PUBLIC_KEY missing");
    return false;
  }
  try {
    if (Notification.permission === "denied") return false;
    if (Notification.permission === "default") {
      const result = await Notification.requestPermission();
      if (result !== "granted") return false;
    }
    const registration = await readyRegistration();
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
    }
    const endpoint = subscription.endpoint;
    const p256dh = arrayBufferToBase64(subscription.getKey("p256dh"));
    const auth = arrayBufferToBase64(subscription.getKey("auth"));
    if (!endpoint || !p256dh || !auth) return false;
    const deviceLabel =
      ((navigator as any).userAgentData?.platform as string) ||
      navigator.platform ||
      "web";
    const { error } = await safeSupabaseQuery(() =>
      (supabase.from("push_subscriptions") as any).upsert(
        { user_id: userId, endpoint, p256dh, auth, device_label: String(deviceLabel).slice(0, 64) },
        { onConflict: "user_id,endpoint" }
      )
    );
    if (error) {
      console.warn("[FB-DEBUG] subscribePush: row persist failed:", error);
      return false;
    }
    return true;
  } catch (e) {
    console.warn("[FB-DEBUG] subscribePush failed:", e);
    return false;
  }
}

/** Remove the browser subscription + delete owned rows. */
export async function unsubscribePush(userId: string): Promise<void> {
  try {
    if (isPushSupported()) {
      const registration = await readyRegistration(4000);
      const subscription = await registration.pushManager.getSubscription();
      const endpoint = subscription?.endpoint || null;
      if (subscription) await subscription.unsubscribe();
      if (endpoint && userId) {
        await safeSupabaseQuery(() =>
          (supabase.from("push_subscriptions") as any)
            .delete()
            .eq("user_id", userId)
            .eq("endpoint", endpoint)
        );
      }
    }
  } catch (e) {
    console.warn("[FB-DEBUG] unsubscribePush failed:", e);
  }
}

/**
 * Clear the app-icon badge whenever the app is visibly open — the user is
 * HERE, so nothing is unread. Call once at app root.
 */
export function initBadgeClearOnVisible(): void {
  if (typeof document === "undefined") return;
  const clear = () => {
    try {
      const nav = navigator as unknown as { clearAppBadge?: () => Promise<void> };
      if (document.visibilityState === "visible" && nav.clearAppBadge) {
        nav.clearAppBadge().catch(() => {});
      }
    } catch {
      /* unsupported — ignore */
    }
  };
  document.addEventListener("visibilitychange", clear);
  clear();
}
