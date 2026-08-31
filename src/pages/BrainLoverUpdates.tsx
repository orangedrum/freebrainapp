/**
 * BrainLoverUpdates — the BrainLover's "Updates" page with two tabs:
 *   Tab 1: "Log"     — chronological timeline of FreeBrainer activity + support
 *   Tab 2: "Results"  — insights chart, ratio, leaderboard, team roster
 *
 * Route: /updates (nav label: "Updates")
 * Nav: BrainLover role only
 *
 * This is a slim composition layer — all sections live in src/features/brainlover/.
 */
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollText, BarChart3, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useBrainLoverData } from "@/features/brainlover/useBrainLoverData";
import { FreeBrainerSelector } from "@/features/brainlover/FreeBrainerSelector";
import { useBrainLoverUpdates } from "@/features/brainlover/useBrainLoverUpdates";
import { TimelineRenderer } from "@/features/brainlover/TimelineRenderer";
import { useBrainLoverLeaderboard } from "@/features/brainlover/useBrainLoverLeaderboard";
import { MonthlySummaryCard } from "@/features/brainlover/MonthlySummaryCard";
import { BrainLoverStreakRatioCard } from "@/features/brainlover/BrainLoverStreakRatioCard";
import { BrainLoverInsightsChart } from "@/features/brainlover/BrainLoverInsightsChart";
import { BrainLoverTabbedLeaderboard } from "@/features/brainlover/BrainLoverTabbedLeaderboard";

import { BrainLoverTeamCard } from "@/features/brainlover/BrainLoverTeamCard";
import { useTeamRoster } from "@/features/freebrainer/useTeamRoster";
import { useTeamProfile } from "@/features/freebrainer/useTeamProfile";

export default function BrainLoverUpdates() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") === "results" ? "results" : "log");

  const {
    isLoading,
    patients,
    selectedPatientId,
    setSelectedPatientId,
    patient,
  } = useBrainLoverData(user?.id);

  const { events, loading: timelineLoading, refetch: refetchTimeline } = useBrainLoverUpdates(
    patient?.user_id || selectedPatientId || null,
    patient?.display_name,
    patient?.email,
    patients // pass ALL FreeBrainers so the timeline merges all of them
  );

  // Refetch timeline when a new activity/note is logged from the dashboard
  useEffect(() => {
    const handler = () => refetchTimeline();
    window.addEventListener("fb-activity-logged", handler);
    return () => window.removeEventListener("fb-activity-logged", handler);
  }, [refetchTimeline]);

  // Leaderboard data (for streak, score, rank)
  const { currentStreak, freeBrainScore, teams } = useBrainLoverLeaderboard(
    patient?.user_id || selectedPatientId || null
  );

  // Team profile + roster — use the FreeBrainer's ID, not the BrainLover's
  const selectedId = patient?.user_id || selectedPatientId || null;
  const { team, loading: teamLoading, refresh: refreshTeam } = useTeamProfile(selectedId);
  const { members, brainLoversByMember, loading: rosterLoading, refresh: refreshRoster } = useTeamRoster(team?.id || null, selectedId);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20 text-muted-foreground">
        {t("caregiverDashboard.loading", "Loading...")}
      </div>
    );
  }

  const selectedPatientIdResolved = patient?.user_id || selectedPatientId || null;

  // Find the FreeBrainer's team rank
  const currentTeamRank = teams.find((t2) => t2.isCurrentTeam)?.rank;



  return (
    <div className="space-y-6 pb-24 text-foreground">
      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight">
            {t("brainLoverUpdates.title", "Updates")}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {t("brainLoverUpdates.subtitle", "Track your FreeBrainer's progress and team activity.")}
          </p>
        </div>
        {patients.length > 1 && (
          <FreeBrainerSelector
            patients={patients}
            selectedPatientId={selectedPatientId}
            onSelect={setSelectedPatientId}
          />
        )}
      </div>

      {/* ── Tabs: Log | Results ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="log" className="gap-1.5">
            <ScrollText className="h-4 w-4" />
            {t("brainLoverUpdates.logTab", "Log")}
          </TabsTrigger>
          <TabsTrigger value="results" className="gap-1.5">
            <BarChart3 className="h-4 w-4" />
            {t("brainLoverUpdates.resultsTab", "Results")}
          </TabsTrigger>
        </TabsList>

        {/* ── Log tab ── */}
        <TabsContent value="log" className="mt-6">
          {timelineLoading ? (
            <div className="flex justify-center items-center py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <TimelineRenderer events={events} />
          )}
        </TabsContent>

        {/* ── Results tab ── */}
        <TabsContent value="results" className="mt-6 space-y-6">
          {/* 1. Monthly summary */}
          <MonthlySummaryCard
            patientId={selectedPatientIdResolved}
            patientName={patient?.display_name}
            streak={currentStreak}
            score={freeBrainScore}
            weeklyRank={currentTeamRank}
          />

          {/* 2. 30-day ratio */}
          <BrainLoverStreakRatioCard patientId={selectedPatientIdResolved} />

          {/* 3. Aha insights chart */}
          <BrainLoverInsightsChart patient={patient} />

          {/* 4. Tabbed leaderboard (Your FreeBrainer / FreeBrainer's Team) */}
          <BrainLoverTabbedLeaderboard
            patientId={selectedPatientIdResolved}
            patientName={patient?.display_name}
            caregiverId={user?.id}
            caregiverEmail={user?.email}
          />

          {/* 5. Team card with roster + rally + management */}
          <BrainLoverTeamCard
            team={team}
            memberCount={members.length + 1}
            rank={currentTeamRank}
            userId={selectedId || undefined}
            members={members}
            brainLoversByMember={brainLoversByMember}
            selectedMemberId={selectedPatientIdResolved}
            onTeamJoined={() => { refreshTeam(); refreshRoster(); }}
            onTeamUpdated={() => refreshTeam()}
            onLeftTeam={() => { refreshTeam(); refreshRoster(); }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
