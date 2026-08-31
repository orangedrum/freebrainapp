/**
 * ScoreboardAndLeaderboards — slim orchestrator composing modular sub-components.
 *
 * Sub-components (all in src/components/dashboard/):
 *  - StreakScoreCard       → streak display + "Guilt-Free Rules?" button
 *  - FreeBrainScoreCard    → total points + "Raise Standing" button
 *  - IndividualLeaderboard → 5-person window around current user
 *  - TeamLeaderboard       → 5-team window around current user's team
 *  - GuiltFreeRulesModal   → streak rules explanation
 *  - RaiseStandingModal    → quick video to earn +50 points
 *
 * Data: useLeaderboardData hook (Tier 2 — Supabase).
 * All strings use i18n inside sub-components.
 */
import { useState } from "react";
import { useLeaderboardData } from "@/features/freebrainer/useLeaderboardData";
import { useAuth } from "@/contexts/AuthContext";
import { StreakScoreCard } from "./StreakScoreCard";
import { FreeBrainScoreCard } from "./FreeBrainScoreCard";
import { IndividualLeaderboard } from "./IndividualLeaderboard";
import { TeamLeaderboard } from "./TeamLeaderboard";
import { GuiltFreeRulesModal } from "./GuiltFreeRulesModal";
import { RaiseStandingModal } from "./RaiseStandingModal";

export function ScoreboardAndLeaderboards() {
  const { user } = useAuth();
  const { individual, teams, currentStreak, freeBrainScore, loading, refresh } =
    useLeaderboardData();

  const [showStreakModal, setShowStreakModal] = useState(false);
  const [showRaiseModal, setShowRaiseModal] = useState(false);

  return (
    <div className="space-y-6">
      {/* 1. Scoreboard Header: Streak & Score */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StreakScoreCard streak={currentStreak} onShowRules={() => setShowStreakModal(true)} />
        <FreeBrainScoreCard score={freeBrainScore} onRaise={() => setShowRaiseModal(true)} />
      </div>

      {/* 2. Leaderboard Snippets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <IndividualLeaderboard items={individual} loading={loading} onBoost={() => setShowRaiseModal(true)} />
        <TeamLeaderboard items={teams} loading={loading} onBoost={() => setShowRaiseModal(true)} />
      </div>

      {/* Modals */}
      <GuiltFreeRulesModal open={showStreakModal} onOpenChange={setShowStreakModal} />
      <RaiseStandingModal
        open={showRaiseModal}
        onOpenChange={setShowRaiseModal}
        freeBrainScore={freeBrainScore}
        userId={user?.id}
        onBoostComplete={refresh}
      />
    </div>
  );
}
