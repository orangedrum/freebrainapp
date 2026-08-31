/**
 * TabbedLeaderboardSection — score cards + tabbed Me/My Team leaderboard.
 *
 * Layout:
 *  Row 1: StreakScoreCard | FreeBrainScoreCard (50/50 grid)
 *  Row 2: Tabs → "Me" (IndividualLeaderboard) | "My Team" (TeamLeaderboard)
 *
 * Default tab: "Me" (individual — personal progress focus).
 *
 * Manages GuiltFreeRulesModal and RaiseStandingModal internally.
 * Data: useLeaderboardData hook (Tier 2 — Supabase).
 * All strings use i18n inside sub-components.
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLeaderboardData } from "@/features/freebrainer/useLeaderboardData";
import { useAuth } from "@/contexts/AuthContext";
import { StreakScoreCard } from "@/components/dashboard/StreakScoreCard";
import { FreeBrainScoreCard } from "@/components/dashboard/FreeBrainScoreCard";
import { IndividualLeaderboard } from "@/components/dashboard/IndividualLeaderboard";
import { TeamLeaderboard } from "@/components/dashboard/TeamLeaderboard";
import { GuiltFreeRulesModal } from "@/components/dashboard/GuiltFreeRulesModal";
import { RaiseStandingModal } from "@/components/dashboard/RaiseStandingModal";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export function TabbedLeaderboardSection() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { individual, teams, currentStreak, freeBrainScore, loading, refresh } =
    useLeaderboardData();

  const [showStreakModal, setShowStreakModal] = useState(false);
  const [showRaiseModal, setShowRaiseModal] = useState(false);

  return (
    <div className="space-y-6">
      {/* Row 1: Score cards (50/50) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StreakScoreCard streak={currentStreak} onShowRules={() => setShowStreakModal(true)} />
        <FreeBrainScoreCard score={freeBrainScore} onRaise={() => setShowRaiseModal(true)} />
      </div>

      {/* Row 2: Tabbed leaderboard — Me / My Team */}
      <Tabs defaultValue="me" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="me" className="font-bold">
            {t("scoreboard.tabMe", "Me")}
          </TabsTrigger>
          <TabsTrigger value="team" className="font-bold">
            {t("scoreboard.tabMyTeam", "My Team")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="me">
          <IndividualLeaderboard
            items={individual}
            loading={loading}
            onBoost={() => setShowRaiseModal(true)}
          />
        </TabsContent>

        <TabsContent value="team">
          <TeamLeaderboard
            items={teams}
            loading={loading}
            onBoost={() => setShowRaiseModal(true)}
          />
        </TabsContent>
      </Tabs>

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
