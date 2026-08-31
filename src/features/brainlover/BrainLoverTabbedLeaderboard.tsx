/**
 * BrainLoverTabbedLeaderboard — score cards + tabbed leaderboard
 * for the BrainLover dashboard, showing the selected FreeBrainer's data.
 *
 * Layout:
 *  Row 1: StreakScoreCard | FreeBrainScoreCard (50/50 grid)
 *  Row 2: Tabs → "Your FreeBrainer" (IndividualLeaderboard) | "FreeBrainer's Team" (TeamLeaderboard)
 *
 * Default tab: "Your FreeBrainer" (individual — personal progress focus).
 *
 * Reuses the same StreakScoreCard, FreeBrainScoreCard, IndividualLeaderboard,
 * and TeamLeaderboard components as the FreeBrainer dashboard.
 *
 * @param patientId — the selected FreeBrainer's user_id
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useBrainLoverLeaderboard } from "@/features/brainlover/useBrainLoverLeaderboard";
import { StreakScoreCard } from "@/components/dashboard/StreakScoreCard";
import { FreeBrainScoreCard } from "@/components/dashboard/FreeBrainScoreCard";
import { IndividualLeaderboard } from "@/components/dashboard/IndividualLeaderboard";
import { TeamLeaderboard } from "@/components/dashboard/TeamLeaderboard";
import { GuiltFreeRulesModal } from "@/components/dashboard/GuiltFreeRulesModal";
import { EncourageFlowModal } from "@/features/brainlover/EncourageFlowModal";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export function BrainLoverTabbedLeaderboard({
  patientId,
  patientName,
  caregiverId,
  caregiverEmail,
  refreshKey,
}: {
  patientId: string | null | undefined;
  patientName?: string;
  caregiverId?: string;
  caregiverEmail?: string;
  refreshKey?: number;
}) {
  const { t } = useTranslation();
  const { individual, teams, currentStreak, freeBrainScore, loading } =
    useBrainLoverLeaderboard(patientId, refreshKey);

  const [showStreakModal, setShowStreakModal] = useState(false);
  const [showRaiseModal, setShowRaiseModal] = useState(false);

  // No patient selected — don't render
  if (!patientId) return null;

  return (
    <div className="space-y-6">
      {/* Row 1: Score cards (50/50) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StreakScoreCard streak={currentStreak} onShowRules={() => setShowStreakModal(true)} />
        <FreeBrainScoreCard score={freeBrainScore} onRaise={() => setShowRaiseModal(true)} />
      </div>

      {/* Row 2: Tabbed leaderboard — Your FreeBrainer / FreeBrainer's Team */}
      <Tabs defaultValue="patient" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="patient" className="font-bold">
            {t("caregiverDashboard.tabYourFreeBrainer", "Your FreeBrainer")}
          </TabsTrigger>
          <TabsTrigger value="team" className="font-bold">
            {t("caregiverDashboard.tabFreeBrainerTeam", "FreeBrainer's Team")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="patient">
          <IndividualLeaderboard
            items={individual}
            loading={loading}
            onBoost={() => {}}
          />
        </TabsContent>

        <TabsContent value="team">
          <TeamLeaderboard
            items={teams}
            loading={loading}
            onBoost={() => {}}
          />
        </TabsContent>
      </Tabs>

    {/* Modals */}
    <GuiltFreeRulesModal open={showStreakModal} onOpenChange={setShowStreakModal} />

    {/* Raise Standing → EncourageFlowModal (video recommendation + boost) */}
    <EncourageFlowModal
      isOpen={showRaiseModal}
      onClose={() => setShowRaiseModal(false)}
      mode="raiseStanding"
      patientId={patientId}
      patientName={patientName || "FreeBrainer"}
      caregiverId={caregiverId || ""}
      caregiverEmail={caregiverEmail}
      freeBrainScore={freeBrainScore}
      onBoostComplete={() => {}}
    />
  </div>
  );
}
