/**
 * BrainLoverTeamSection — team management section for the BrainLover dashboard.
 *
 * Wraps BrainLoverTeamCard with the FreeBrainer's team data.
 * Uses useTeamProfile(overrideUserId) to look up the FreeBrainer's team
 * (not the BrainLover's own team).
 *
 * Reuses: useTeamProfile, useTeamRoster, BrainLoverTeamCard
 */
import { useTeamProfile } from "@/features/freebrainer/useTeamProfile";
import { useTeamRoster } from "@/features/freebrainer/useTeamRoster";
import { BrainLoverTeamCard } from "@/features/brainlover/BrainLoverTeamCard";
import { useBrainLoverLeaderboard } from "@/features/brainlover/useBrainLoverLeaderboard";

export function BrainLoverTeamSection({ patientId }: { patientId: string }) {
  const { team, loading, refresh: refreshTeam } = useTeamProfile(patientId);
  const { members, brainLoversByMember, loading: rosterLoading, refresh: refreshRoster } = useTeamRoster(team?.id || null, patientId);
  const { teams } = useBrainLoverLeaderboard(patientId);

  if (loading) {
    return (
      <div className="h-24 rounded-xl bg-muted/20 animate-pulse" />
    );
  }

  const currentTeamRank = teams.find((t) => t.isCurrentTeam)?.rank;

  return (
    <BrainLoverTeamCard
      team={team}
      memberCount={members.length + 1}
      rank={currentTeamRank}
      userId={patientId}
      members={members}
      brainLoversByMember={brainLoversByMember}
      selectedMemberId={patientId}
      onTeamJoined={() => { refreshTeam(); refreshRoster(); }}
      onTeamUpdated={() => refreshTeam()}
      onLeftTeam={() => { refreshTeam(); refreshRoster(); }}
    />
  );
}
