import { useState, useEffect, useCallback } from "react";
import { supabase, safeSupabaseQuery } from "@/lib/supabase";
import { isNotificationEnabled } from "@/lib/notificationPreferences";

export interface SessionInvite {
  id: string;
  type: string;
  message: string | null;
  created_at: string | null;
}

/**
 * useSessionNotifications — the first reader of the `session_notifications`
 * table (written by CalendlyModal's "notify team" flow, previously never
 * read). Returns unread session invites for banner display.
 *
 * Honors the sessionReminders granular toggle: when off, nothing is fetched
 * or shown. Refreshes on mount, foreground return, and the fb-session-notify
 * event dispatched right after an invite is written.
 */
export function useSessionNotifications(userId: string | undefined, role: string) {
  const [invites, setInvites] = useState<SessionInvite[]>([]);

  const load = useCallback(async () => {
    if (!userId) {
      setInvites([]);
      return;
    }
    let enabled = true;
    try {
      enabled = isNotificationEnabled(userId, role, "sessionReminders");
    } catch {
      enabled = true;
    }
    if (!enabled) {
      setInvites([]);
      return;
    }
    try {
      const { data } = await safeSupabaseQuery<any[]>(() =>
        (supabase.from("session_notifications") as any)
          .select("id, type, message, created_at")
          .eq("recipient_id", userId)
          .is("read_at", null)
          .order("created_at", { ascending: false })
          .limit(5)
      );
      setInvites(Array.isArray(data) ? data : []);
    } catch (e) {
      console.warn("[FB-DEBUG] useSessionNotifications load failed (non-fatal):", e);
    }
  }, [userId, role]);

  useEffect(() => {
    load();
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    const onNotify = () => load();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("fb-session-notify", onNotify);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("fb-session-notify", onNotify);
    };
  }, [load]);

  const markRead = useCallback(async (id: string) => {
    setInvites((prev) => prev.filter((i) => i.id !== id));
    try {
      await safeSupabaseQuery(() =>
        (supabase.from("session_notifications") as any)
          .update({ read_at: new Date().toISOString() })
          .eq("id", id)
      );
    } catch (e) {
      console.warn("[FB-DEBUG] useSessionNotifications markRead failed (non-fatal):", e);
    }
  }, []);

  return { invites, markRead, reload: load };
}
