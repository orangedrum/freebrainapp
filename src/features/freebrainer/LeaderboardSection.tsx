import { ScoreboardAndLeaderboards } from "@/components/dashboard/ScoreboardAndLeaderboards";

/**
 * FreeBrainer dashboard section: Scoreboard & Leaderboard snippets.
 *
 * Thin wrapper around the shared ScoreboardAndLeaderboards component.
 * The shared component handles all i18n internally.
 */
export function LeaderboardSection() {
  return <ScoreboardAndLeaderboards />;
}
