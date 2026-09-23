import { useState, useEffect, useCallback, useRef } from "react";
import { supabase, safeSupabaseQuery } from "@/lib/supabase";
import { isNotificationEnabled } from "@/lib/notificationPreferences";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();
  // IDs currently being dismissed — blocks double-taps racing the write.
  const dismissingRef = useRef<Set<string>>(new Set());

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
    if (dismissingRef.current.has(id)) return;
    dismissingRef.current.add(id);
    // Optimistic removal — reverted below if the write fails, so a failed
    // dismiss can never silently resurrect on the next reload.
    const removed = invites.find((i) => i.id === id) || null;
    setInvites((prev) => prev.filter((i) => i.id !== id));
    try {
      const { error } = await safeSupabaseQuery(() =>
        (supabase.from("session_notifications") as any)
          .update({ read_at: new Date().toISOString() })
          .eq("id", id)
      );
      if (error) {
        if (removed) setInvites((prev) => [removed, ...prev]);
        toast({
          title: "Couldn't dismiss",
          description: "The invite is still unread — check your connection and try again.",
          variant: "destructive",
        });
      }
    } catch (e) {
      console.warn("[FB-DEBUG] useSessionNotifications markRead failed (non-fatal):", e);
      if (removed) setInvites((prev) => [removed, ...prev]);
    } finally {
      dismissingRef.current.delete(id);
    }
  }, [invites, toast]);

  return { invites, markRead, reload: load };
}
