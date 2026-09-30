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

/**
 * Diagnose the baked-in VAPID public key WITHOUT trusting eyeballs.
 * Returns null when the key is well-formed, otherwise a plain-English
 * verdict (wrong key pasted? private key? truncated? whitespace?).
 */
function diagnoseVapidKey(key: string): string | null {
  if (key.trim() !== key) {
    return "has leading/trailing whitespace (copy-paste artifact) — trim it in the hosting env";
  }
  if (key.length === 43) {
    return "is 43 chars long — that is the PRIVATE key, not the public one. The app needs the 87-char PUBLIC key here; the private key lives only in Supabase Secrets";
  }
  if (!/^[A-Za-z0-9_-]+$/.test(key)) {
    return "contains characters outside base64url (check for spaces, line breaks, or quotes pasted in)";
  }
  try {
    const bytes = urlBase64ToUint8Array(key);
    if (bytes.length !== 65) {
      return `decodes to ${bytes.length} bytes but a VAPID public key must decode to exactly 65 (uncompressed P-256 point) — value is truncated or from a different pair`;
    }
    if (bytes[0] !== 0x04) {
      return "does not start with 0x04 — not an uncompressed P-256 point, wrong key material";
    }
  } catch {
    return "is not valid base64url at all";
  }
  return null;
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
  if (!isPushSupported()) {
    console.warn("[FB-DEBUG] subscribePush: push unsupported in this browser (no ServiceWorker/PushManager — e.g. in-app mini-browser). Use full Chrome or the installed app.");
    return false;
  }
  if (!userId) {
    console.warn("[FB-DEBUG] subscribePush: no userId (not signed in?) — cannot persist a subscription.");
    return false;
  }
  const vapidKey = vapidPublicKey();
  if (!vapidKey) {
    console.warn("[FB-DEBUG] subscribePush: VITE_VAPID_PUBLIC_KEY missing from this build (add it to hosting env, then REBUILD).");
    return false;
  }
  console.log("[FB-DEBUG] subscribePush: baked key check", {
    length: vapidKey.length,
    prefix: vapidKey.slice(0, 6),
  });
  const keyDiagnosis = diagnoseVapidKey(vapidKey);
  if (keyDiagnosis) {
    console.warn("[FB-DEBUG] subscribePush: baked VAPID public key is malformed —", keyDiagnosis);
    return false;
  }
  try {
    if (Notification.permission === "denied") {
      console.warn("[FB-DEBUG] subscribePush: Notification permission previously DENIED — code cannot re-prompt; user must re-allow in browser site settings first.");
      return false;
    }
    if (Notification.permission === "default") {
      const result = await Notification.requestPermission();
      if (result !== "granted") {
        console.warn("[FB-DEBUG] subscribePush: permission prompt was DISMISSED (not answered) — permission is still 'default'. Tap the toggle again and choose Allow (not the X).");
        return false;
      }
    }
    const registration = await readyRegistration();
    const expectedKey = urlBase64ToUint8Array(vapidKey);
    let subscription = await registration.pushManager.getSubscription();
    // Drop stale subscriptions created WITHOUT our VAPID key (e.g. from
    // earlier testing rounds): their keys are unreadable, so reusing them
    // fails silently below. Unsubscribe and start fresh instead.
    const expectedKeyB64 = arrayBufferToBase64(
      expectedKey.buffer as ArrayBuffer
    );
    const currentKey = subscription?.options?.applicationServerKey ?? null;
    const currentKeyB64 = currentKey ? arrayBufferToBase64(currentKey) : "";
    if (subscription && (!currentKeyB64 || currentKeyB64 !== expectedKeyB64)) {
      console.warn(
        "[FB-DEBUG] subscribePush: dropping stale subscription (wrong/missing VAPID key) and re-subscribing."
      );
      try {
        await subscription.unsubscribe();
      } catch {
        /* already dead — proceed to fresh subscribe */
      }
      subscription = null;
    }
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: expectedKey,
      });
    }
    const endpoint = subscription.endpoint;
    const p256dh = arrayBufferToBase64(subscription.getKey("p256dh"));
    const auth = arrayBufferToBase64(subscription.getKey("auth"));
    if (!endpoint || !p256dh || !auth) {
      console.warn(
        "[FB-DEBUG] subscribePush: subscription has no usable keys even after a fresh subscribe — clear this site's data and retry."
      );
      return false;
    }
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
