/**
 * useTeamRankWatcher — Detects when a team passes another team on the
 * leaderboard and auto-creates a community post announcing it.
 *
 * How it works:
 * 1. Fetches all teams with their aggregate scores from Supabase
 * 2. Ranks them by score (descending)
 * 3. Compares to the previous ranking stored in localStorage
 * 4. For each team that moved UP past another team, inserts a
 *    community_post with type="team_rank_change" and metadata JSON
 * 5. Saves the new ranking to localStorage for next comparison
 *
 * Data tier: Tier 2 (Supabase) — team scores and community posts are social data.
 * The previous ranking cache is ephemeral (localStorage) — it's just a
 * comparison snapshot, not sensitive data.
 *
 * i18n: No user-facing strings here — the post content is structured metadata.
 */
import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

interface TeamScore {
  id: string;
  name: string;
  score: number;
}

interface RankSnapshot {
  ranks: Record<string, number>; // teamId -> rank
  timestamp: string;
}

const SNAPSHOT_KEY = "fb_team_rank_snapshot";
const POSTED_CHANGES_KEY = "fb_team_rank_posted_changes";

/**
 * Fetch all teams with their aggregate member scores from Supabase.
 * Score = sum of all members' total_score from profiles.
 */
async function fetchTeamScores(): Promise<TeamScore[]> {
  // 1. Get all teams
  const { data: teams, error: teamErr } = await supabase
    .from("teams")
    .select("id, name") as { data: any[] | null; error: any };

  if (teamErr || !teams || teams.length === 0) return [];

  // 2. Get all team_members (links user_id → team_id)
  const { data: members, error: memberErr } = await supabase
    .from("team_members")
    .select("team_id, user_id") as { data: any[] | null; error: any };

  if (memberErr || !members) return teams.map((t) => ({ id: t.id, name: t.name, score: 0 }));

  // 3. Get all profiles with total_score
  const { data: profiles, error: profErr } = await supabase
    .from("profiles")
    .select("user_id, total_score") as { data: any[] | null; error: any };

  if (profErr || !profiles) return teams.map((t) => ({ id: t.id, name: t.name, score: 0 }));

  // 4. Build userId → total_score map
  const userScoreMap = new Map<string, number>();
  profiles.forEach((p) => {
    userScoreMap.set(p.user_id, p.total_score || 0);
  });

  // 5. Aggregate scores by team via team_members join
  const teamScoreMap = new Map<string, number>();
  members.forEach((m) => {
    const score = userScoreMap.get(m.user_id) || 0;
    teamScoreMap.set(m.team_id, (teamScoreMap.get(m.team_id) || 0) + score);
  });

  return teams.map((t) => ({
    id: t.id,
    name: t.name,
    score: teamScoreMap.get(t.id) || 0,
  }));
}

/**
 * Rank teams by score (descending). Returns a map of teamId -> rank (1-indexed).
 */
function rankTeams(teams: TeamScore[]): Record<string, number> {
  const sorted = [...teams].sort((a, b) => b.score - a.score);
  const ranks: Record<string, number> = {};
  sorted.forEach((t, i) => {
    ranks[t.id] = i + 1;
  });
  return ranks;
}

/**
 * Detect which teams passed which other teams.
 * A team "passed" another if its new rank < old rank AND the other team's
 * new rank > its old rank, and they swapped positions.
 */
function detectPasses(
  teams: TeamScore[],
  oldRanks: Record<string, number>,
  newRanks: Record<string, number>
): { passingTeam: TeamScore; passedTeam: TeamScore; newRank: number; oldRank: number }[] {
  const passes: any[] = [];

  for (const team of teams) {
    const oldRank = oldRanks[team.id];
    const newRank = newRanks[team.id];
    if (!oldRank || !newRank) continue;
    if (newRank >= oldRank) continue; // Team didn't move up

    // Find teams this team passed — teams whose old rank was between
    // newRank and oldRank-1 (inclusive), meaning they were ahead before
    // but are now behind
    for (const other of teams) {
      if (other.id === team.id) continue;
      const otherOldRank = oldRanks[other.id];
      const otherNewRank = newRanks[other.id];
      if (!otherOldRank || !otherNewRank) continue;

      // This team passed 'other' if:
      // - 'other' was ahead before (otherOldRank < oldRank)
      // - This team is ahead now (newRank < otherNewRank)
      if (otherOldRank < oldRank && newRank < otherNewRank) {
        passes.push({
          passingTeam: team,
          passedTeam: other,
          newRank,
          oldRank,
        });
      }
    }
  }

  return passes;
}

/**
 * Check if we've already posted about this specific rank change
 * (to avoid duplicate posts on re-renders / multiple devices).
 */
function hasAlreadyPosted(passingId: string, passedId: string): boolean {
  try {
    const posted = JSON.parse(localStorage.getItem(POSTED_CHANGES_KEY) || "[]");
    return posted.some(
      (p: any) => p.passingId === passingId && p.passedId === passedId
    );
  } catch {
    return false;
  }
}

function markAsPosted(passingId: string, passedId: string) {
  try {
    const posted = JSON.parse(localStorage.getItem(POSTED_CHANGES_KEY) || "[]");
    posted.push({ passingId, passedId, ts: Date.now() });
    // Keep only last 50 entries
    const trimmed = posted.slice(-50);
    localStorage.setItem(POSTED_CHANGES_KEY, JSON.stringify(trimmed));
  } catch {
    /* ignore */
  }
}

/**
 * Check Supabase for an existing post about this rank change
 * (cross-device deduplication).
 */
async function checkExistingPost(passingTeamName: string, passedTeamName: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from("community_posts")
      .select("id")
      .eq("type", "team_rank_change")
      .contains("metadata", { passingTeam: passingTeamName, passedTeam: passedTeamName })
      .limit(1);

    return !!(data && data.length > 0);
  } catch {
    return false;
  }
}

export function useTeamRankWatcher() {
  const { user } = useAuth();
  const hasRun = useRef(false);

  useEffect(() => {
    if (!user || hasRun.current) return;
    hasRun.current = true;

    (async () => {
      try {
        const teams = await fetchTeamScores();
        if (teams.length < 2) return;

        const newRanks = rankTeams(teams);

        // Load previous snapshot
        let oldRanks: Record<string, number> = {};
        try {
          const snapshotStr = localStorage.getItem(SNAPSHOT_KEY);
          if (snapshotStr) {
            const snapshot: RankSnapshot = JSON.parse(snapshotStr);
            oldRanks = snapshot.ranks;
          }
        } catch {
          /* no previous snapshot */
        }

        // If no previous snapshot, just save current and return
        if (Object.keys(oldRanks).length === 0) {
          localStorage.setItem(
            SNAPSHOT_KEY,
            JSON.stringify({ ranks: newRanks, timestamp: new Date().toISOString() })
          );
          return;
        }

        // Detect passes
        const passes = detectPasses(teams, oldRanks, newRanks);

        if (passes.length === 0) {
          // Save snapshot for next time
          localStorage.setItem(
            SNAPSHOT_KEY,
            JSON.stringify({ ranks: newRanks, timestamp: new Date().toISOString() })
          );
          return;
        }

        // Create community posts for each pass (with deduplication)
        for (const pass of passes) {
          // Local dedup
          if (hasAlreadyPosted(pass.passingTeam.id, pass.passedTeam.id)) continue;

          // Cross-device dedup via Supabase
          const exists = await checkExistingPost(pass.passingTeam.name, pass.passedTeam.name);
          if (exists) {
            markAsPosted(pass.passingTeam.id, pass.passedTeam.id);
            continue;
          }

          // Insert the post
          const { error } = await supabase.from("community_posts").insert({
            user_id: user.id,
            posted_by_id: user.id,
            content: null, // Content is in metadata for structured rendering
            type: "team_rank_change",
            metadata: {
              passingTeam: pass.passingTeam.name,
              passedTeam: pass.passedTeam.name,
              newRank: pass.newRank,
              oldRank: pass.oldRank,
            },
          } as any);

          if (!error) {
            markAsPosted(pass.passingTeam.id, pass.passedTeam.id);
            console.log(
              `[FB-DEBUG] Team rank change posted: ${pass.passingTeam.name} passed ${pass.passedTeam.name}`
            );
          }
        }

        // Save new snapshot
        localStorage.setItem(
          SNAPSHOT_KEY,
          JSON.stringify({ ranks: newRanks, timestamp: new Date().toISOString() })
        );
      } catch (e) {
        console.warn("[FB-DEBUG] Team rank watcher error:", e);
      }
    })();
  }, [user]);
}
