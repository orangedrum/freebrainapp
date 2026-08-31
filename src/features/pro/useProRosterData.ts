/**
 * useProRosterData — Shared data hook for Pro dashboard components.
 *
 * Fetches all FreeBrainers linked to a BrainLover Pro (via caregiver_links
 * + managed_freebrainers), their profiles, today's check-in status, latest
 * streak, and 30-day check-in history for aggregate stats.
 *
 * Tier 2 (Supabase): All data here is non-sensitive social data (check-in
 * completions, streaks, display names, conditions). No Tier 1 symptom data
 * is fetched — that stays in localStorage on the FreeBrainer's device.
 *
 * Used by: ProRosterTable, ProFacilityOverview, ProFreeBrainerDetailDrawer.
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export interface RosterEntry {
  user_id: string;
  display_name: string;
  condition: string | null;
  has_checked_in_today: boolean;
  streak: number;
  /** 30-day check-in history (dates only, for aggregate stats) */
  recent_checkin_dates: string[];
}

export interface FacilityStats {
  totalFreeBrainers: number;
  checkedInToday: number;
  /** Percentage of FreeBrainers who checked in today */
  checkInRate: number;
  /** Sum of all FreeBrainer streaks */
  totalStreakDays: number;
  /** Average streak across all FreeBrainers */
  avgStreak: number;
  /** Longest active streak among all FreeBrainers */
  longestStreak: number;
  /** Name of the FreeBrainer with the longest streak */
  longestStreakName: string | null;
  /** 30-day check-in count across all FreeBrainers */
  total30DayCheckins: number;
}

export function useProRosterData(proId: string | undefined) {
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadRoster = useCallback(async () => {
    if (!proId) return;
    setIsLoading(true);
    try {
      // 1. Get all FreeBrainers linked via caregiver_links
      const { data: links } = await supabase
        .from("caregiver_links")
        .select("patient_id")
        .eq("caregiver_id", proId);

      const patientIds: string[] = (links || []).map((l: any) => l.patient_id);

      // 2. Also get managed sub-accounts
      const { data: managed } = await supabase
        .from("managed_freebrainers")
        .select("id, display_name")
        .eq("managed_by", proId);

      const managedIds: string[] = (managed || []).map((m: any) => m.id);
      const allIds = [...patientIds, ...managedIds];

      if (allIds.length === 0) {
        setRoster([]);
        return;
      }

      // 3. Fetch profiles for all FreeBrainers
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, condition")
        .in("user_id", allIds);

      const profileMap = new Map<string, any>();
      (profiles || []).forEach((p: any) => profileMap.set(p.user_id, p));

      // 4. Fetch today's check-ins
      const todayStr = new Date().toISOString().split("T")[0];
      const { data: todayCheckins } = await supabase
        .from("daily_checkins")
        .select("user_id, streak_count")
        .gte("created_at", `${todayStr}T00:00:00.000Z`)
        .in("user_id", allIds);

      const checkinMap = new Map<string, any>();
      (todayCheckins || []).forEach((c: any) => checkinMap.set(c.user_id, c));

      // 5. Fetch latest streak for each FreeBrainer (most recent check-in)
      const { data: latestCheckins } = await supabase
        .from("daily_checkins")
        .select("user_id, streak_count")
        .in("user_id", allIds)
        .order("created_at", { ascending: false });

      const streakMap = new Map<string, number>();
      (latestCheckins || []).forEach((c: any) => {
        if (!streakMap.has(c.user_id)) {
          streakMap.set(c.user_id, c.streak_count || 0);
        }
      });

      // 6. Fetch 30-day check-in history for aggregate stats
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: recentCheckins } = await supabase
        .from("daily_checkins")
        .select("user_id, created_at")
        .in("user_id", allIds)
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: true });

      const recentDatesMap = new Map<string, string[]>();
      (recentCheckins || []).forEach((c: any) => {
        const uid = c.user_id;
        const dateStr = new Date(c.created_at).toISOString().split("T")[0];
        if (!recentDatesMap.has(uid)) recentDatesMap.set(uid, []);
        const dates = recentDatesMap.get(uid)!;
        if (!dates.includes(dateStr)) dates.push(dateStr);
      });

      // 7. Build roster entries
      const entries: RosterEntry[] = allIds.map((id) => {
        const profile = profileMap.get(id);
        const checkin = checkinMap.get(id);
        return {
          user_id: id,
          display_name: profile?.display_name || "FreeBrainer",
          condition: profile?.condition || null,
          has_checked_in_today: !!checkin,
          streak: streakMap.get(id) || 0,
          recent_checkin_dates: recentDatesMap.get(id) || [],
        };
      });

      setRoster(entries);
    } catch (err) {
      console.error("Error loading Pro roster:", err);
    } finally {
      setIsLoading(false);
    }
  }, [proId]);

  useEffect(() => {
    loadRoster();
  }, [loadRoster]);

  /** Compute aggregate facility stats from the roster */
  const computeStats = (): FacilityStats => {
    if (roster.length === 0) {
      return {
        totalFreeBrainers: 0,
        checkedInToday: 0,
        checkInRate: 0,
        totalStreakDays: 0,
        avgStreak: 0,
        longestStreak: 0,
        longestStreakName: null,
        total30DayCheckins: 0,
      };
    }

    const checkedInToday = roster.filter((r) => r.has_checked_in_today).length;
    const totalStreakDays = roster.reduce((sum, r) => sum + r.streak, 0);
    const total30DayCheckins = roster.reduce(
      (sum, r) => sum + r.recent_checkin_dates.length,
      0
    );

    let longestStreak = 0;
    let longestStreakName: string | null = null;
    roster.forEach((r) => {
      if (r.streak > longestStreak) {
        longestStreak = r.streak;
        longestStreakName = r.display_name;
      }
    });

    return {
      totalFreeBrainers: roster.length,
      checkedInToday,
      checkInRate: Math.round((checkedInToday / roster.length) * 100),
      totalStreakDays,
      avgStreak: Math.round(totalStreakDays / roster.length),
      longestStreak,
      longestStreakName,
      total30DayCheckins,
    };
  };

  return {
    roster,
    isLoading,
    loadRoster,
    stats: computeStats(),
  };
}
