/**
 * useBrainLoverSupportBadge — checks for unread support messages.
 *
 * Returns `hasUnread` (boolean) — true if the current BrainLover has any
 * brainlover_support messages where seen_at IS NULL and created_at is
 * within the last 24 hours.
 *
 * Polls every 30 seconds. Dev-bypass safe (returns false).
 */
import { useState, useEffect, useCallback } from "react";
import { supabase, safeSupabaseQuery } from "@/lib/supabase";

export function useBrainLoverSupportBadge(brainloverId: string | undefined) {
  const [hasUnread, setHasUnread] = useState(false);

  const check = useCallback(async () => {
    if (!brainloverId) {
      setHasUnread(false);
      return;
    }
    try {
      const result: any = await safeSupabaseQuery<any>(() =>
        (supabase.from("brainlover_support") as any)
          .select("*", { count: "exact", head: true })
          .eq("to_brainlover_id", brainloverId)
          .is("seen_at", null)
          .gt("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      );
      setHasUnread((result?.count || 0) > 0);
    } catch (e) {
      // Non-fatal: table may not exist yet or RLS may block — silently skip
      setHasUnread(false);
    }
  }, [brainloverId]);

  useEffect(() => {
    check();
    const interval = setInterval(check, 30000);
    // Re-check when a new support message is sent
    const handler = () => check();
    window.addEventListener("fb-support-sent", handler);
    window.addEventListener("fb-support-seen", handler);
    return () => {
      clearInterval(interval);
      window.removeEventListener("fb-support-sent", handler);
      window.removeEventListener("fb-support-seen", handler);
    };
  }, [check]);

  return { hasUnread, refresh: check };
}
