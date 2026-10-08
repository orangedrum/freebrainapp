/**
 * notificationPrefsSync — server write-through for notification toggles.
 *
 * The toggles still live in localStorage (instant, offline-friendly), but
 * they are ALSO mirrored to the `notification_prefs` table so send-push can
 * honor them for pushes sent from ANOTHER device (a BrainLover nudging a
 * FreeBrainer). localStorage alone is invisible to the sender.
 *
 * Design:
 *   • hydrate: read the remote row once, merge into localStorage (remote
 *     wins — it is the shared source of truth once any device has written).
 *   • persist: fire-and-forget upsert after every local change. Never throws
 *     (a settings screen must keep working even if the network is down).
 *   • timezone: written ONLY when the editor IS the preference owner. A
 *     supporter editing their FreeBrainer's toggles must not stamp their own
 *     timezone onto the FreeBrainer's row.
 *
 * No health data — delivery preferences only.
 */
import { supabase } from "@/lib/supabase";
import {
  getNotificationPrefs,
  setNotificationPrefs,
  type NotificationPrefs,
} from "@/lib/notificationPreferences";

/** The editor's own IANA timezone, only when editing their own prefs. */
async function ownerTimezone(userId: string): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== userId) return null;
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

/**
 * Merge the server row (if any) into localStorage and return the result.
 * Falls back to local prefs on any error / missing row.
 */
export async function hydrateNotificationPrefs(userId: string, role: string): Promise<NotificationPrefs> {
  const local = getNotificationPrefs(userId, role);
  try {
    const { data, error } = await supabase
      .from("notification_prefs")
      .select("channels, toggles")
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !data) return local;

    const remote = data as { channels?: Record<string, boolean>; toggles?: Record<string, boolean> };
    const merged: NotificationPrefs = {
      channels: { ...local.channels, ...(remote.channels || {}) },
      toggles: { ...local.toggles, ...(remote.toggles || {}) },
    };
    setNotificationPrefs(userId, merged);
    return merged;
  } catch (e) {
    console.warn("[FB-DEBUG] notify prefs hydrate skipped:", e);
    return local;
  }
}

/**
 * Mirror local prefs to the server. Fire-and-forget — callers must not await
 * this in a way that blocks the toggle UI.
 */
export async function persistNotificationPrefs(
  userId: string,
  role: string,
  prefs: NotificationPrefs
): Promise<void> {
  try {
    const row: Record<string, unknown> = {
      user_id: userId,
      role,
      channels: prefs.channels,
      toggles: prefs.toggles,
      updated_at: new Date().toISOString(),
    };
    const tz = await ownerTimezone(userId);
    if (tz) row.timezone = tz;
    const { error } = await supabase.from("notification_prefs").upsert(row, { onConflict: "user_id" });
    if (error) console.warn("[FB-DEBUG] notify prefs persist rejected:", error.message);
  } catch (e) {
    console.warn("[FB-DEBUG] notify prefs persist skipped:", e);
  }
}

/**
 * Ensure a prefs row exists with the user's role + timezone WITHOUT touching
 * channels/toggles (PostgREST only updates the columns provided). Called from
 * the dashboard shell so scheduled jobs can compute a user's local time even
 * if they never open the settings screen. Fire-and-forget.
 */
export async function syncNotificationMeta(userId: string, role: string): Promise<void> {
  if (!userId || !role) return;
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || null;
    const { error } = await supabase.from("notification_prefs").upsert(
      { user_id: userId, role, timezone, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
    if (error) console.warn("[FB-DEBUG] notify meta sync rejected:", error.message);
  } catch (e) {
    console.warn("[FB-DEBUG] notify meta sync skipped:", e);
  }
}
