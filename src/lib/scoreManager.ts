/**
 * scoreManager — central utility for reading and updating FreeBrain scores.
 *
 * All score mutations MUST go through this module so the source of truth
 * (Supabase `profiles.total_score`) stays consistent across:
 *   - Check-in flow (points earned for moving)
 *   - BrainLover boosts (direct +50)
 *   - BrainLover video recommendations (+50 in raiseStanding mode)
 *   - FreeBrainer Raise Standing modal (+50)
 *
 * Data tier: Tier 2 (social) — scores are non-sensitive, stored in Supabase.
 */

import { supabase, safeSupabaseQuery } from "@/lib/supabase";
import { isDevBypassUser } from "@/lib/devBypass";

/**
 * Read the current total_score for a user from Supabase.
 * Falls back to localStorage cache or 420 baseline.
 */
export async function getFreeBrainScore(userId: string): Promise<number> {
  // Dev-bypass: read from localStorage only
  if (isDevBypassUser(userId)) {
    const cached = localStorage.getItem(`fb_score_${userId}`);
    return cached ? parseInt(cached, 10) : 420;
  }

  try {
    const { data } = await safeSupabaseQuery<any>(() =>
      (supabase.from("profiles") as any)
        .select("total_score")
        .eq("user_id", userId)
        .maybeSingle()
    );
    if (data?.total_score != null) {
      localStorage.setItem(`fb_score_${userId}`, data.total_score.toString());
      return data.total_score;
    }
  } catch (e) {
    console.warn("[FB-DEBUG] getFreeBrainScore error:", e);
  }

  // Fallback to localStorage cache or baseline
  const cached = localStorage.getItem(`fb_score_${userId}`);
  return cached ? parseInt(cached, 10) : 420;
}

/**
 * Add points to a user's total_score in Supabase.
 * Uses an atomic increment (read current → add → write) since Supabase
 * doesn't support `UPDATE ... SET total_score = total_score + N` via the
 * JS client without an RPC function.
 *
 * Also updates the localStorage cache so the UI reflects the change
 * immediately before the Supabase round-trip completes.
 *
 * @param userId  The FreeBrainer's user ID
 * @param points  Points to add (must be positive)
 * @returns The new total score, or null on failure
 */
export async function addFreeBrainPoints(
  userId: string,
  points: number
): Promise<number | null> {
  if (!userId || points <= 0) return null;

  // Dev-bypass: localStorage only (no valid UUID for Supabase)
  if (isDevBypassUser(userId)) {
    const current = await getFreeBrainScore(userId);
    const newScore = current + points;
    localStorage.setItem(`fb_score_${userId}`, newScore.toString());
    return newScore;
  }

  try {
    // Read current score from Supabase (source of truth)
    const currentScore = await getFreeBrainScore(userId);
    const newScore = currentScore + points;

    // Optimistic localStorage update for instant UI feedback
    localStorage.setItem(`fb_score_${userId}`, newScore.toString());

    // Persist to Supabase
    const { error } = await safeSupabaseQuery(() =>
      (supabase.from("profiles") as any)
        .update({ total_score: newScore })
        .eq("user_id", userId)
    );

    if (error) {
      console.warn("[FB-DEBUG] addFreeBrainPoints Supabase update error:", error);
      // Still return the optimistic score — localStorage is the fallback
      return newScore;
    }

    return newScore;
  } catch (e) {
    console.warn("[FB-DEBUG] addFreeBrainPoints error:", e);
    return null;
  }
}
