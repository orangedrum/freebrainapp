/**
 * useLeaderboardData — Fetches real individual and team leaderboard data
 * from Supabase, sorted by total_score descending.
 *
 * Data tier: Tier 2 (social) — scores, names, conditions are non-sensitive
 * social data stored in Supabase.
 *
 * Individual leaderboard:
 *   1. Query profiles with total_score, display_name, avatar_url
 *   2. Join user_roles to filter only freebrainers
 *   3. Sort by total_score DESC
 *   4. Return a window around the current user (2 above, 2 below)
 *
 * Team leaderboard:
 *   1. Query all teams
 *   2. For each team, sum total_score of all members (via team_members → profiles)
 *   3. Sort by aggregate score DESC
 *   4. Return a window around the current user's team (2 above, 2 below)
 */

import { useState, useEffect, useCallback } from "react";
import { supabase, safeSupabaseQuery } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export interface LeaderboardUser {
  rank: number;
  userId: string;
  name: string;
  avatar?: string;
  condition: string;
  score: number;
  isCurrentUser?: boolean;
}

export interface LeaderboardTeam {
  rank: number;
  teamId: string;
  name: string;
  membersCount: number;
  score: number;
  isCurrentTeam?: boolean;
}

interface UseLeaderboardDataResult {
  individual: LeaderboardUser[];
  teams: LeaderboardTeam[];
  currentStreak: number;
  freeBrainScore: number;
  loading: boolean;
  refresh: () => void;
}

// ── Condition label helper ──
// Reads the non-sensitive condition from medical_profiles (Tier 2).
// Falls back to a generic label if not found.
function getConditionLabel(medCondition: string | null): string {
  if (!medCondition) return "Movement Warrior";
  return medCondition;
}

export function useLeaderboardData(): UseLeaderboardDataResult {
  const { user } = useAuth();
  const [individual, setIndividual] = useState<LeaderboardUser[]>([]);
  const [teams, setTeams] = useState<LeaderboardTeam[]>([]);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [freeBrainScore, setFreeBrainScore] = useState(420);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const loadLeaderboard = async () => {
      setLoading(true);

      try {
        // ── 1. Fetch current user's score & streak ──
        const { data: myProfile } = await safeSupabaseQuery<any>(() =>
          (supabase.from("profiles") as any)
            .select("total_score, display_name, avatar_url")
            .eq("user_id", user.id)
            .maybeSingle()
        );

        const myScore = myProfile?.total_score || 420;
        if (!cancelled) setFreeBrainScore(myScore);

        // Calculate streak from daily_checkins
        const { data: checkins } = await safeSupabaseQuery<any>(() =>
          (supabase.from("daily_checkins") as any)
            .select("checkin_date, moved, checkin_status")
            .eq("user_id", user.id)
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

        // ── 2. Individual leaderboard: all profiles with scores ──
        // Query profiles joined with user_roles to get only freebrainers
        const { data: allProfiles } = await safeSupabaseQuery<any>(() =>
          (supabase.from("profiles") as any)
            .select("user_id, display_name, avatar_url, total_score")
            .not("total_score", "is", null)
            .order("total_score", { ascending: false })
            .limit(100)
        );

        // Also fetch user_roles to filter freebrainers
        const { data: roles } = await safeSupabaseQuery<any>(() =>
          (supabase.from("user_roles") as any)
            .select("user_id, role")
            .eq("role", "freebrainer")
        );

        const freebrainerIds = new Set((roles || []).map((r: any) => r.user_id));

        console.log("[FB-DEBUG] Leaderboard: profiles fetched =", allProfiles?.length, "| freebrainer roles =", freebrainerIds.size);

        // Fetch conditions from medical_profiles (Tier 2 — non-sensitive)
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
            isCurrentUser: p.user_id === user.id,
          }));

        // Build a window around the current user (2 above, 2 below)
        let individualSnippet: LeaderboardUser[] = [];
        if (ranked.length === 0) {
          // No data — just show the current user
          individualSnippet = [
            {
              rank: 1,
              userId: user.id,
              name: myProfile?.display_name || "You",
              avatar: myProfile?.avatar_url || undefined,
              condition: "Movement Warrior",
              score: myScore,
              isCurrentUser: true,
            },
          ];
        } else {
          const myRankIdx = ranked.findIndex((r) => r.userId === user.id);
          if (myRankIdx === -1) {
            // Current user not in the list (score might be null) — add them at the end
            ranked.push({
              rank: ranked.length + 1,
              userId: user.id,
              name: myProfile?.display_name || "You",
              avatar: myProfile?.avatar_url || undefined,
              condition: "Movement Warrior",
              score: myScore,
              isCurrentUser: true,
            });
          }

          const finalIdx = ranked.findIndex((r) => r.userId === user.id);
          const start = Math.max(0, finalIdx - 2);
          const end = Math.min(ranked.length, finalIdx + 3);
          individualSnippet = ranked.slice(start, end).map((r, i) => ({
            ...r,
            rank: start + i + 1,
          }));
        }

        if (!cancelled) setIndividual(individualSnippet);

        // ── 3. Team leaderboard ──
        const { data: allTeams } = await safeSupabaseQuery<any>(() =>
          (supabase.from("teams") as any)
            .select("id, name")
        );

        // Get current user's team
        const { data: myTeamMember } = await safeSupabaseQuery<any>(() =>
          (supabase.from("team_members") as any)
            .select("team_id")
            .eq("user_id", user.id)
            .maybeSingle()
        );
        const myTeamId = myTeamMember?.team_id || null;

        // Get all team_members with their profiles' total_score
        const { data: allTeamMembers } = await safeSupabaseQuery<any>(() =>
          (supabase.from("team_members") as any)
            .select("team_id, user_id")
        );

        // Build a map of userId → total_score from the profiles we already fetched
        const scoreMap = new Map<string, number>();
        (allProfiles || []).forEach((p: any) => {
          scoreMap.set(p.user_id, p.total_score || 0);
        });
        // Ensure current user's score is in the map
        scoreMap.set(user.id, myScore);

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
            isCurrentTeam: t.id === myTeamId,
          }))
          .sort((a, b) => b.score - a.score)
          .map((t, i) => ({ ...t, rank: i + 1 }));

        // Build a window around the current user's team (2 above, 2 below)
        let teamSnippet: LeaderboardTeam[] = [];
        if (rankedTeams.length === 0) {
          teamSnippet = [];
        } else if (myTeamId) {
          const myTeamIdx = rankedTeams.findIndex((t) => t.teamId === myTeamId);
          if (myTeamIdx === -1) {
            teamSnippet = rankedTeams.slice(0, 5);
          } else {
            const start = Math.max(0, myTeamIdx - 2);
            const end = Math.min(rankedTeams.length, myTeamIdx + 3);
            teamSnippet = rankedTeams.slice(start, end).map((t, i) => ({
              ...t,
              rank: start + i + 1,
            }));
          }
        } else {
          // No team — show top 5
          teamSnippet = rankedTeams.slice(0, 5);
        }

        if (!cancelled) setTeams(teamSnippet);
      } catch (e) {
        console.warn("[FB-DEBUG] Leaderboard data error:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadLeaderboard();
    return () => {
      cancelled = true;
    };
  }, [user, refreshKey]);

  return {
    individual,
    teams,
    currentStreak,
    freeBrainScore,
    loading,
    refresh,
  };
}
