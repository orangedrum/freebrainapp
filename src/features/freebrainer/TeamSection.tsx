/**
 * TeamSection — the unified "Your Team" section on the FreeBrainer's Love page.
 *
 * Single card with:
 *  - Team image, name, slogan (editable via TeamProfileEditor)
 *  - Team rank with neighbors (from useLeaderboardData)
 *  - Rally Team CTA
 *  - Team roster (all members with cheer, recommend video, add teammate)
 *  - Bulk cheer / bulk recommend video actions
 *  - Leave team button
 *
 * Reuses:
 *  - TeamProfileEditor (inline edit for name/slogan/image)
 *  - useLeaderboardData (team ranking window)
 *  - useTeamRoster (roster data + BrainLovers)
 *  - RallyTeamToMoveModal (rally action)
 *  - RecommendVideoModal (video recommendation)
 *  - InviteTeammateModal (add team members)
 *  - sendTeammateCheer (one-tap + bulk cheer)
 *  - LeaveTeamButton (logic and dialog to exit team)
 *
 * Data tier: Tier 2 (social) — all data is non-sensitive, stored in Supabase.
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Megaphone, Users,
  UserPlus, Video,
} from "lucide-react";
import { TeamProfileEditor } from "@/components/shared/TeamProfileEditor";
import { RallyTeamModal } from "@/features/checkin/RallyTeamModal";
import { RosterRow } from "@/features/freebrainer/RosterRow";
import { RankRow } from "@/features/freebrainer/RankRow";
import { useTeamProfile } from "@/features/freebrainer/useTeamProfile";
import { useTeamRoster, type TeamMember } from "@/features/freebrainer/useTeamRoster";
import { useLeaderboardData } from "@/features/freebrainer/useLeaderboardData";
import { sendTeammateCheer } from "@/lib/brainloverInteractions";
import { RecommendVideoModal } from "@/components/shared/RecommendVideoModal";
import { BulkRecommendModal } from "@/features/freebrainer/BulkRecommendModal";
import { LeaveTeamButton } from "@/features/freebrainer/LeaveTeamButton";
import { InviteTeammateModal } from "@/components/profile/InviteTeammateModal";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export function TeamSection() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const { team, loading: teamLoading, refresh: refreshTeam } = useTeamProfile();
  const { teams: rankedTeams, loading: leaderboardLoading } = useLeaderboardData();
  const { members, brainLoversByMember, loading: rosterLoading, refresh: refreshRoster } =
    useTeamRoster(team?.id);

  const [joinTeamOpen, setJoinTeamOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [recModalMember, setRecModalMember] = useState<TeamMember | null>(null);
  const [cheeringId, setCheeringId] = useState<string | null>(null);
  const [bulkCheering, setBulkCheering] = useState(false);
  const [bulkRecOpen, setBulkRecOpen] = useState(false);

  // Find current team's rank and neighbors
  const currentTeamRank = rankedTeams.find((tm) => tm.isCurrentTeam);
  const currentIdx = rankedTeams.findIndex((tm) => tm.isCurrentTeam);
  const teamAbove = currentIdx > 0 ? rankedTeams[currentIdx - 1] : null;
  const teamBelow = currentIdx >= 0 && currentIdx < rankedTeams.length - 1 ? rankedTeams[currentIdx + 1] : null;

  const handleCheer = async (member: TeamMember) => {
    if (!user) return;
    setCheeringId(member.user_id);
    try {
      await sendTeammateCheer(user.id, user.email || "Teammate", member.user_id);
      toast({
        title: t("roster.cheerSentTitle", "Cheer sent!"),
        description: t("roster.cheerSentDesc", { name: member.display_name }),
      });
    } catch {
      toast({ title: t("roster.cheerErrorTitle", "Failed to send cheer"), variant: "destructive" });
    } finally {
      setCheeringId(null);
    }
  };

  const handleBulkCheer = async () => {
    if (!user || members.length === 0) return;
    setBulkCheering(true);
    let successCount = 0;
    for (const member of members) {
      try {
        await sendTeammateCheer(user.id, user.email || "Teammate", member.user_id);
        successCount++;
      } catch { /* continue */ }
    }
    setBulkCheering(false);
    toast({
      title: t("roster.bulkCheerSent", "Cheered the whole team!"),
      description: t("roster.bulkCheerDesc", { count: successCount }),
    });
  };

  if (teamLoading) {
    return (
      <Card className="border-border shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="h-20 rounded-xl bg-muted/20 animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  if (!team) {
    return (
      <>
        <Card className="border-border shadow-sm">
          <CardContent className="p-4 sm:p-5 text-center space-y-3">
            <div className="p-3 rounded-full bg-primary/10 w-fit mx-auto">
              <Users className="h-7 w-7 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-foreground">
                {t("love.noTeamTitle", "No team yet")}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
                {t("love.noTeamDesc", "Join a team from your profile to rally together!")}
              </p>
            </div>
            <Button className="gap-2 font-bold" onClick={() => setJoinTeamOpen(true)}>
              <Users className="h-4 w-4" />
              {t("network.joinOrStartTeam", "Join or Start a Team")}
            </Button>
          </CardContent>
        </Card>
        <RallyTeamModal
          isOpen={joinTeamOpen}
          onClose={() => setJoinTeamOpen(false)}
          userId={user?.id}
          onTeamJoined={() => refreshTeam()}
          title={t("network.joinOrCreateTeam")}
          description={t("network.searchOrCreateTeam")}
        />
      </>
    );
  }

  return (
    <>
      <Card className="border-border shadow-sm">
        <CardContent className="p-4 sm:p-5 space-y-4">
          {/* Section header */}
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/15 text-primary">
              <Users className="h-4 w-4" />
            </div>
            <h3 className="font-bold text-sm sm:text-base text-foreground">
              {t("love.teamSection", "Your Team")}
            </h3>
          </div>

          {/* Team profile editor */}
          <TeamProfileEditor team={team} onTeamUpdated={() => refreshTeam()} />

          {/* Team rank neighbors */}
          <div className="rounded-xl border border-border/60 bg-muted/10 p-3 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {t("love.teamRank", "Team Rank")}
            </p>
            {leaderboardLoading ? (
              <div className="h-8 rounded-lg bg-muted/20 animate-pulse" />
            ) : currentTeamRank ? (
              <div className="space-y-1.5">
                {teamAbove && (
                  <RankRow rank={teamAbove.rank} name={teamAbove.name} score={teamAbove.score} isCurrent={false} direction="above" />
                )}
                <RankRow rank={currentTeamRank.rank} name={currentTeamRank.name} score={currentTeamRank.score} isCurrent={true} />
                {teamBelow && (
                  <RankRow rank={teamBelow.rank} name={teamBelow.name} score={teamBelow.score} isCurrent={false} direction="below" />
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-2">
                {t("love.noRankData", "Rank data unavailable")}
              </p>
            )}
          </div>

          {/* Roster header + bulk actions */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h4 className="font-bold text-sm text-foreground">
              {t("roster.title", "Team Roster")}
            </h4>
            <div className="flex items-center gap-1.5">
              {members.length > 0 && (
                <>
                  <Button
                    size="sm" variant="outline"
                    className="gap-1.5 text-xs shrink-0 border-success/40 text-success hover:bg-success/10 font-bold"
                    onClick={handleBulkCheer}
                    disabled={bulkCheering}
                  >
                    {bulkCheering ? <Users className="h-3.5 w-3.5 animate-spin" /> : <Megaphone className="h-3.5 w-3.5" />}
                    {t("roster.cheerAll", "Cheer All")}
                  </Button>
                  <Button
                    size="sm" variant="outline"
                    className="gap-1.5 text-xs shrink-0 text-primary hover:bg-primary/10"
                    onClick={() => setBulkRecOpen(true)}
                  >
                    <Video className="h-3.5 w-3.5" />
                    {t("roster.recommendAll", "Recommend All")}
                  </Button>
                </>
              )}
              <Button
                size="sm" variant="outline"
                className="gap-1.5 text-xs shrink-0"
                onClick={() => setInviteOpen(true)}
              >
                <UserPlus className="h-3.5 w-3.5" />
                {t("roster.addTeammate", "Add Teammate")}
              </Button>
            </div>
          </div>

          {/* Roster list */}
          {rosterLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-xl bg-muted/20 animate-pulse" />
              ))}
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-6 space-y-3">
              <div className="p-3 rounded-full bg-primary/10 w-fit mx-auto">
                <UserPlus className="h-7 w-7 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-foreground">
                  {t("roster.emptyTitle", "No teammates yet")}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
                  {t("roster.emptyDesc", "Invite someone to join your team!")}
                </p>
              </div>
              <Button size="sm" className="gap-2 font-bold" onClick={() => setInviteOpen(true)}>
                <UserPlus className="h-4 w-4" />
                {t("roster.addTeammate", "Add Teammate")}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {members.map((member) => (
                <RosterRow
                  key={member.user_id}
                  member={member}
                  brainLovers={brainLoversByMember[member.user_id] || []}
                  isCheering={cheeringId === member.user_id}
                  onCheer={() => handleCheer(member)}
                  onRecommend={() => setRecModalMember(member)}
                  viewerRole="freebrainer"
                  isOwnRow={member.user_id === user?.id}
                  isAssociatedFreeBrainer={false}
                />
              ))}
            </div>
          )}

          {/* Leave team button */}
          <LeaveTeamButton
            teamId={team.id}
            teamName={team.name}
            onLeft={() => { refreshTeam(); refreshRoster(); }}
          />
        </CardContent>
      </Card>

      {/* Modals */}

      <InviteTeammateModal open={inviteOpen} onOpenChange={setInviteOpen} team={{ id: team.id, name: team.name, code: team.code }} />

      <RecommendVideoModal
        isOpen={!!recModalMember}
        onClose={() => setRecModalMember(null)}
        patientId={recModalMember?.user_id || ""}
        patientName={recModalMember?.display_name || ""}
        senderName={user?.email || "Teammate"}
      />

      <BulkRecommendModal
        isOpen={bulkRecOpen}
        onClose={() => setBulkRecOpen(false)}
        members={members}
        senderName={user?.email || "Teammate"}
        onDone={() => { refreshRoster(); setBulkRecOpen(false); }}
      />
    </>
  );
}
