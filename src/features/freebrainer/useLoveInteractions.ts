/**
 * useLoveInteractions — aggregates all encouragement a FreeBrainer receives.
 *
 * Combines:
 *  1. BrainLover interactions (pokes, cheers, video recommendations) — from
 *     `fetchBrainLoverInteractions` (Supabase + localStorage)
 *  2. Team rally alerts (SOS, rallies from teammates) — from
 *     `getActiveRalliesForUser` (localStorage)
 *
 * Returns a unified list of "love items" the Love page can render, plus a
 * `hasUnacknowledged` flag for the nav badge.
 *
 * Data tiers:
 *  - BrainLover interactions: Tier 2 (social) via Supabase community_posts
 *  - Team rallies: Tier 2 (social) via localStorage cache (mirrors Supabase)
 *  - Recommended video completion check: Tier 2 (daily_checkins)
 */
import { useState, useEffect, useCallback } from "react";
import {
  fetchBrainLoverInteractions,
  dismissBrainLoverInteraction,
  BrainLoverInteraction,
} from "@/lib/brainloverInteractions";
import { getActiveRalliesForUser, TeamRallyAlert } from "@/lib/teamRally";

export type LoveItemType = "poke" | "cheer" | "recommend_video" | "rally" | "sos";

export interface LoveItem {
  id: string;
  type: LoveItemType;
  senderName: string;
  title: string;
  message?: string;
  video?: { id: string; title: string; thumbnail?: string; embedUrl?: string };
  customMessage?: string;
  createdAt: string;
  /** For team rallies — links to community wall */
  isTeamRally?: boolean;
}

export function useLoveInteractions(userId?: string, teamId?: string | null) {
  const [items, setItems] = useState<LoveItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const loveItems: LoveItem[] = [];

    // 2. Team rally alerts (SOS, rallies from teammates) — synchronous localStorage, fast
    try {
      const rallies = getActiveRalliesForUser(userId, teamId);
      rallies.forEach((r: TeamRallyAlert) => {
        loveItems.push({
          id: r.id,
          type: r.type === "sos" ? "sos" : "rally",
          senderName: r.author_name,
          title: r.type === "sos" ? "SOS Support Request" : "Team Rally to Move!",
          message: r.message,
          createdAt: r.created_at,
          isTeamRally: true,
        });
      });
    } catch (e) {
      console.warn("[FB-DEBUG] useLoveInteractions: failed to fetch team rallies", e);
    }

    // Show local data immediately (don't block on Supabase)
    loveItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setItems([...loveItems]);
    setLoading(false);

    // 1. BrainLover interactions (pokes, cheers, video recommendations) — async, may be slow
    //    Fetch in the background and merge when ready. Never blocks the UI.
    try {
      const interactions = await fetchBrainLoverInteractions(userId);
      interactions.forEach((act: BrainLoverInteraction) => {
        // Avoid duplicates
        if (!loveItems.some((i) => i.id === act.id)) {
          loveItems.push({
            id: act.id,
            type: act.type as LoveItemType,
            senderName: act.sender_name,
            title: act.title,
            message: act.message,
            video: act.video,
            customMessage: act.customMessage,
            createdAt: act.created_at,
          });
        }
      });
      loveItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setItems([...loveItems]);
    } catch (e) {
      console.warn("[FB-DEBUG] useLoveInteractions: failed to fetch BrainLover interactions", e);
    }
  }, [userId, teamId]);

  useEffect(() => {
    load();

    // Listen for real-time updates
    const handleInteraction = () => load();
    window.addEventListener("brainlover_interaction_sent", handleInteraction);
    window.addEventListener("team_rally_dispatched", handleInteraction);

    return () => {
      window.removeEventListener("brainlover_interaction_sent", handleInteraction);
      window.removeEventListener("team_rally_dispatched", handleInteraction);
    };
  }, [load]);

  // Dismiss a BrainLover interaction (pokes, cheers, recommendations)
  const dismiss = useCallback(
    (item: LoveItem) => {
      if (!userId || item.isTeamRally) return;
      dismissBrainLoverInteraction(userId, item.id, item.type);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    },
    [userId]
  );

  // Remove a team rally from the local list (visual dismiss only)
  const dismissRally = useCallback((itemId: string) => {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  }, []);

  // Whether there are any unacknowledged items (for nav badge)
  const hasUnacknowledged = items.length > 0;

  return { items, loading, hasUnacknowledged, dismiss, dismissRally, refetch: load };
}
