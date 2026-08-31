/**
 * useTeamRoster — fetches all members of the current user's team
 * along with today's check-in status, streak, condition, and SOS state.
 *
 * Also fetches each FreeBrainer's linked BrainLovers (via caregiver_links)
 * and merges them into the roster as virtual team members (ADR 006).
 *
 * Data tier: Tier 2 (social) — all data is non-sensitive, stored in Supabase.
 *
 * Dev-bypass: Returns mock roster so the Love page renders cleanly
 * when an admin is role-switching.
 *
 * Returns:
 *  - members: array of TeamMember objects (FreeBrainers only)
 *  - brainLoversByMember: map of userId → RosterBrainLover[] (their BrainLovers)
 *  - loading: boolean
 *  - refresh: re-fetch trigger
 */
import { useState, useEffect, useCallback } from "react";
import { supabase, safeSupabaseQuery } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { isDevBypassUser, isDevBypassMode } from "@/lib/devBypass";
export interface TeamMember {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  total_score: number;
  condition: string | null;
  /** Whether the member has checked in today */
  checked_in_today: boolean;
  /** Current streak in days */
  streak: number;
  /** Whether the member has an active SOS post today */
  has_sos: boolean;
}

export interface RosterBrainLover {
  caregiver_id: string;
  display_name: string;
  avatar_url?: string;
}

export function useTeamRoster(teamId?: string | null, overrideUserId?: string | null) {
  const { user } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [brainLoversByMember, setBrainLoversByMember] = useState<Record<string, RosterBrainLover[]>>({});
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    if (!user || !teamId) {
      setMembers([]);
      setBrainLoversByMember({});
      setLoading(false);
      return;
    }

    // ── Dev-bypass: return mock roster with mock BrainLovers ──
    // When admin role-switches, seed mock team members + BrainLovers
    // so the roster renders with data. Uses isDevBypassMode() to catch
    // both dev-user-id and real-session admin proxy (isTestingMode).
    if (isDevBypassUser(user.id) || isDevBypassMode()) {
      const mockMembers: TeamMember[] = [
        {
          user_id: "dev-patient-1",
          display_name: "Jean K.",
          avatar_url: null,
          total_score: 1250,
          condition: "Parkinson's",
          checked_in_today: true,
          streak: 5,
          has_sos: false,
        },
        {
          user_id: "dev-patient-2",
          display_name: "Maria S.",
          avatar_url: null,
          total_score: 980,
          condition: "Stroke Recovery",
          checked_in_today: false,
          streak: 3,
          has_sos: false,
        },
      ];
      const mockBrainLovers: Record<string, RosterBrainLover[]> = {
        "dev-patient-1": [
          { caregiver_id: "dev-caregiver-1", display_name: "Sarah", avatar_url: undefined },
        ],
        "dev-patient-2": [
          { caregiver_id: "dev-caregiver-2", display_name: "Mike", avatar_url: undefined },
          { caregiver_id: "dev-caregiver-3", display_name: "Linda", avatar_url: undefined },
        ],
      };
      setMembers(mockMembers);
      setBrainLoversByMember(mockBrainLovers);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const today = new Date().toISOString().split("T")[0];

    const fetchRoster = async () => {
      setLoading(true);
      try {
        // 1. Get all user_ids on this team
        const { data: teamMembers } = await safeSupabaseQuery<any>(() =>
          (supabase.from("team_members") as any)
            .select("user_id")
            .eq("team_id", teamId)
        );

        if (!teamMembers || teamMembers.length === 0) {
          if (!cancelled) setMembers([]);
          return;
        }

        const userIds = teamMembers.map((tm: any) => tm.user_id);

        // 2. Fetch profiles for all team members (excluding self)
        //    NOTE: `condition` is NOT a column on `profiles` — it lives in
        //    `medical_profiles.neurological_condition`. Querying a non-existent
        //    column makes Supabase return a 400, so we fetch it separately.
        const { data: profiles } = await safeSupabaseQuery<any>(() =>
          (supabase.from("profiles") as any)
            .select("user_id, display_name, avatar_url, total_score")
            .in("user_id", userIds)
            .neq("user_id", overrideUserId || user.id)
        );

        if (!profiles || profiles.length === 0) {
          if (!cancelled) setMembers([]);
          return;
        }

        // 2b. Fetch conditions from medical_profiles (Tier 2 — non-sensitive)
        const { data: medProfiles } = await safeSupabaseQuery<any>(() =>
          (supabase.from("medical_profiles") as any)
            .select("user_id, neurological_condition")
            .in("user_id", profiles.map((p: any) => p.user_id))
        );
        const conditionMap = new Map<string, string>();
        (medProfiles || []).forEach((m: any) => {
          conditionMap.set(m.user_id, m.neurological_condition);
        });

        // 3. Fetch today's check-ins for all team members
        const { data: todayCheckins } = await safeSupabaseQuery<any>(() =>
          (supabase.from("daily_checkins") as any)
            .select("user_id")
            .in("user_id", profiles.map((p: any) => p.user_id))
            .eq("checkin_date", today)
        );

        const checkedInIds = new Set(
          (todayCheckins || []).map((c: any) => c.user_id)
        );

        // 4. Fetch recent check-ins for streak calculation (last 60 days)
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
        const { data: recentCheckins } = await safeSupabaseQuery<any>(() =>
          (supabase.from("daily_checkins") as any)
            .select("user_id, checkin_date, moved")
            .in("user_id", profiles.map((p: any) => p.user_id))
            .gte("checkin_date", sixtyDaysAgo.toISOString().split("T")[0])
            .order("checkin_date", { ascending: false })
        );

        // Group check-ins by user and compute streak
        const checkinsByUser: Record<string, any[]> = {};
        (recentCheckins || []).forEach((c: any) => {
          if (!checkinsByUser[c.user_id]) checkinsByUser[c.user_id] = [];
          checkinsByUser[c.user_id].push(c);
        });

        // 5. Check for active SOS posts today
        const { data: sosPosts } = await safeSupabaseQuery<any>(() =>
          (supabase.from("community_posts") as any)
            .select("user_id")
            .in("user_id", profiles.map((p: any) => p.user_id))
            .ilike("type", "sos%")
            .gte("created_at", today)
        );

        const sosUserIds = new Set((sosPosts || []).map((p: any) => p.user_id));

        // 6. Assemble the roster
        const roster: TeamMember[] = profiles.map((p: any) => {
          const userCheckins = checkinsByUser[p.user_id] || [];
          const streak = computeStreak(userCheckins);
          return {
            user_id: p.user_id,
            display_name: p.display_name || "FreeBrainer",
            avatar_url: p.avatar_url,
            total_score: p.total_score || 0,
            condition: conditionMap.get(p.user_id) || null,
            checked_in_today: checkedInIds.has(p.user_id),
            streak,
            has_sos: sosUserIds.has(p.user_id),
          };
        });

        if (!cancelled) setMembers(roster);

        // 7. Fetch BrainLovers (caregiver_links) for each team member (ADR 006)
        const allUserIds = profiles.map((p: any) => p.user_id);
        const { data: blLinks } = await safeSupabaseQuery<any>(() =>
          (supabase.from("caregiver_links") as any)
            .select("caregiver_id, patient_id")
            .in("patient_id", allUserIds)
        );

        if (blLinks && blLinks.length > 0) {
          const caregiverIds = [...new Set(blLinks.map((l: any) => l.caregiver_id))];
          const { data: blProfiles } = await safeSupabaseQuery<any>(() =>
            (supabase.from("profiles") as any)
              .select("user_id, display_name, avatar_url")
              .in("user_id", caregiverIds)
          );

          const blMap = new Map<string, any>();
          (blProfiles || []).forEach((p: any) => blMap.set(p.user_id, p));

          const byMember: Record<string, RosterBrainLover[]> = {};
          blLinks.forEach((link: any) => {
            const prof = blMap.get(link.caregiver_id);
            if (!byMember[link.patient_id]) byMember[link.patient_id] = [];
            byMember[link.patient_id].push({
              caregiver_id: link.caregiver_id,
              display_name: prof?.display_name || "BrainLover",
              avatar_url: prof?.avatar_url,
            });
          });

          if (!cancelled) setBrainLoversByMember(byMember);
        } else {
          if (!cancelled) setBrainLoversByMember({});
        }
      } catch (e) {
        console.warn("[FB-DEBUG] useTeamRoster error:", e);
        if (!cancelled) {
          setMembers([]);
          setBrainLoversByMember({});
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchRoster();
    return () => {
      cancelled = true;
    };
  }, [user, teamId, refreshKey]);

  return { members, brainLoversByMember, loading, refresh };
}

/**
 * Compute current streak from check-in records.
 * Counts consecutive days with a check-in (any status keeps streak alive).
 */
function computeStreak(checkins: any[]): number {
  if (!checkins || checkins.length === 0) return 0;

  const dates = new Set(checkins.map((c) => c.checkin_date));
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Start from today and walk backwards
  const cursor = new Date(today);
  while (dates.has(cursor.toISOString().split("T")[0])) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}
