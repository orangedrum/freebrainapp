/**
 * useBrainLoverLeaderboard — fetches leaderboard data for the
 * BrainLover's selected FreeBrainer (not the logged-in user).
 *
 * This is a variant of useLeaderboardData that:
 *   - Uses the FreeBrainer's user_id (not auth.uid())
 *   - Returns the FreeBrainer's individual rank window + their team's rank window
 *   - Returns the FreeBrainer's streak + FreeBrain score
 *
 * Data tier: Tier 2 (social) — scores, names, conditions are non-sensitive.
 *
 * @param patientId — the selected FreeBrainer's user_id
 * @param patientEmail — the FreeBrainer's email (for virtual sessions)
 */
import { useState, useEffect, useCallback } from "react";
import { supabase, safeSupabaseQuery } from "@/lib/supabase";
import type { LeaderboardUser, LeaderboardTeam } from "@/features/freebrainer/useLeaderboardData";

interface UseBrainLoverLeaderboardResult {
  individual: LeaderboardUser[];
  teams: LeaderboardTeam[];
  currentStreak: number;
  freeBrainScore: number;
  loading: boolean;
}

function getConditionLabel(medCondition: string | null): string {
  if (!medCondition) return "Movement Warrior";
  return medCondition;
}

export function useBrainLoverLeaderboard(
  patientId: string | null | undefined,
  refreshKey?: number
): UseBrainLoverLeaderboardResult {
  const [individual, setIndividual] = useState<LeaderboardUser[]>([]);
  const [teams, setTeams] = useState<LeaderboardTeam[]>([]);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [freeBrainScore, setFreeBrainScore] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // refreshKey triggers re-fetch after a score boost
    void refreshKey;
    if (!patientId) {
      setIndividual([]);
      setTeams([]);
      setCurrentStreak(0);
      setFreeBrainScore(0);
      setLoading(false);
      return;
    }

    // Dev-bypass: patientId will be a fake ID (dev-patient-*) — return mock data
    let cancelled = false;

    const loadLeaderboard = async () => {
      setLoading(true);

      try {
        // 1. Fetch the FreeBrainer's profile (score, name, avatar)
        const { data: fbProfile } = await safeSupabaseQuery<any>(() =>
          (supabase.from("profiles") as any)
            .select("total_score, display_name, avatar_url")
            .eq("user_id", patientId)
            .maybeSingle()
        );

        const fbScore = fbProfile?.total_score || 0;
        if (!cancelled) setFreeBrainScore(fbScore);

        // 2. Calculate the FreeBrainer's streak from daily_checkins
        const { data: checkins } = await safeSupabaseQuery<any>(() =>
          (supabase.from("daily_checkins") as any)
            .select("checkin_date, moved, checkin_status")
            .eq("user_id", patientId)
            .order("checkin_date", { ascending: false })
            .limit(60)
        );

        let streak = 0;
        if (checkins && checkins.length > 0) {
          let tempDate = new Date();
          for (let i = 0; i < 60; i++) {
            const dateKey = tempDate.toISOString().split("T")[0];
            const hasRecord = checkins.some(
              (c: any) => c.checkin_date === dateKey && (c.moved || c.checkin_status)
            );
            if (hasRecord) {
              streak++;
              tempDate.setDate(tempDate.getDate() - 1);
            } else if (i === 0) {
              tempDate.setDate(tempDate.getDate() - 1);
            } else {
              break;
            }
          }
        }
        if (!cancelled) setCurrentStreak(Math.max(streak, 0));

        // 3. Fetch all freebrainer profiles for the individual leaderboard
        const { data: allProfiles } = await safeSupabaseQuery<any>(() =>
          (supabase.from("profiles") as any)
            .select("user_id, display_name, avatar_url, total_score")
            .not("total_score", "is", null)
            .order("total_score", { ascending: false })
            .limit(100)
        );

        // Fetch user_roles to filter freebrainers only
        const { data: roles } = await safeSupabaseQuery<any>(() =>
          (supabase.from("user_roles") as any)
            .select("user_id, role")
            .eq("role", "freebrainer")
        );

        const freebrainerIds = new Set((roles || []).map((r: any) => r.user_id));

        // Fetch conditions from medical_profiles
        const { data: medProfiles } = await safeSupabaseQuery<any>(() =>
          (supabase.from("medical_profiles") as any)
            .select("user_id, neurological_condition")
        );
        const conditionMap = new Map<string, string>();
        (medProfiles || []).forEach((m: any) => {
          conditionMap.set(m.user_id, m.neurological_condition);
        });

        // Build the full ranked list
        const ranked: LeaderboardUser[] = (allProfiles || [])
          .filter((p: any) => freebrainerIds.has(p.user_id))
          .map((p: any, idx: number) => ({
            rank: idx + 1,
            userId: p.user_id,
            name: p.display_name || "FreeBrainer",
            avatar: p.avatar_url || undefined,
            condition: getConditionLabel(conditionMap.get(p.user_id) || null),
            score: p.total_score || 0,
            isCurrentUser: p.user_id === patientId,
          }));

        // Build a window around the FreeBrainer (2 above, 2 below)
        let individualSnippet: LeaderboardUser[] = [];
        if (ranked.length === 0) {
          individualSnippet = [
            {
              rank: 1,
              userId: patientId,
              name: fbProfile?.display_name || "FreeBrainer",
              avatar: fbProfile?.avatar_url || undefined,
              condition: "Movement Warrior",
              score: fbScore,
              isCurrentUser: true,
            },
          ];
        } else {
          const fbIdx = ranked.findIndex((r) => r.userId === patientId);
          if (fbIdx === -1) {
            // FreeBrainer not in the list — add them at the end
            ranked.push({
              rank: ranked.length + 1,
              userId: patientId,
              name: fbProfile?.display_name || "FreeBrainer",
              avatar: fbProfile?.avatar_url || undefined,
              condition: "Movement Warrior",
              score: fbScore,
              isCurrentUser: true,
            });
          }
          const finalIdx = ranked.findIndex((r) => r.userId === patientId);
          const start = Math.max(0, finalIdx - 2);
          const end = Math.min(ranked.length, finalIdx + 3);
          individualSnippet = ranked.slice(start, end).map((r, i) => ({
            ...r,
            rank: start + i + 1,
          }));
        }

        if (!cancelled) setIndividual(individualSnippet);

        // 4. Team leaderboard — find the FreeBrainer's team
        const { data: fbTeamMember } = await safeSupabaseQuery<any>(() =>
          (supabase.from("team_members") as any)
            .select("team_id")
            .eq("user_id", patientId)
            .maybeSingle()
        );
        const fbTeamId = fbTeamMember?.team_id || null;

        // Fetch all teams + team_members for aggregation
        const { data: allTeams } = await safeSupabaseQuery<any>(() =>
          (supabase.from("teams") as any)
            .select("id, name")
        );

        const { data: allTeamMembers } = await safeSupabaseQuery<any>(() =>
          (supabase.from("team_members") as any)
            .select("team_id, user_id")
        );

        // Build score map from profiles we already fetched
        const scoreMap = new Map<string, number>();
        (allProfiles || []).forEach((p: any) => {
          scoreMap.set(p.user_id, p.total_score || 0);
        });
        scoreMap.set(patientId, fbScore);

        // Aggregate team scores
        const teamScoreMap = new Map<string, number>();
        const teamMemberCount = new Map<string, number>();
        (allTeamMembers || []).forEach((tm: any) => {
          const score = scoreMap.get(tm.user_id) || 0;
          teamScoreMap.set(tm.team_id, (teamScoreMap.get(tm.team_id) || 0) + score);
          teamMemberCount.set(tm.team_id, (teamMemberCount.get(tm.team_id) || 0) + 1);
        });

        const rankedTeams: LeaderboardTeam[] = (allTeams || [])
          .map((t: any) => ({
            rank: 0,
            teamId: t.id,
            name: t.name || "Unnamed Team",
            membersCount: teamMemberCount.get(t.id) || 0,
            score: teamScoreMap.get(t.id) || 0,
            isCurrentTeam: t.id === fbTeamId,
          }))
          .sort((a, b) => b.score - a.score)
          .map((t, i) => ({ ...t, rank: i + 1 }));

        // Build a window around the FreeBrainer's team
        let teamSnippet: LeaderboardTeam[] = [];
        if (rankedTeams.length === 0) {
          teamSnippet = [];
        } else if (fbTeamId) {
          const fbTeamIdx = rankedTeams.findIndex((t) => t.teamId === fbTeamId);
          if (fbTeamIdx === -1) {
            teamSnippet = rankedTeams.slice(0, 5);
          } else {
            const start = Math.max(0, fbTeamIdx - 2);
            const end = Math.min(rankedTeams.length, fbTeamIdx + 3);
            teamSnippet = rankedTeams.slice(start, end).map((t, i) => ({
              ...t,
              rank: start + i + 1,
            }));
          }
        } else {
          teamSnippet = rankedTeams.slice(0, 5);
        }

        if (!cancelled) setTeams(teamSnippet);
      } catch (e) {
        console.warn("[FB-DEBUG] BrainLover leaderboard data error:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadLeaderboard();
    return () => { cancelled = true; };
  }, [patientId, refreshKey]);

  return { individual, teams, currentStreak, freeBrainScore, loading };
}
