/**
 * BrainLoverTeamCard — team info card with Rally button and team management modal.
 *
 * Shows: team name, member count, rank, and a "Rally Entire Team" button.
 * Clicking the card opens a modal with TeamProfileEditor + LeaveTeamButton.
 *
 * When no team exists, shows a "Join or Start a Team" button that opens
 * the existing RallyTeamModal (search by name, join by code, or create new).
 *
 * BrainLovers can start/join/leave teams and edit team picture via the modal.
 * No cheer/recommend actions — only rally.
 *
 * @param team          — the team object or null
 * @param memberCount   — total members
 * @param rank          — team rank (optional)
 * @param userId        — the FreeBrainer's user_id (for joining teams on their behalf)
 * @param onTeamJoined  — callback after team join/create
 * @param onTeamUpdated — callback after team profile edit
 * @param onLeftTeam    — callback after leaving team
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Megaphone, Users, Pencil, UserPlus } from "lucide-react";
import { TeamProfileEditor } from "@/components/shared/TeamProfileEditor";
import { LeaveTeamButton } from "@/features/freebrainer/LeaveTeamButton";
import { RallyTeamToMoveModal } from "@/components/shared/RallyTeamToMoveModal";
import { RallyTeamModal } from "@/features/checkin/RallyTeamModal";
import { BrainLoverRosterMinimized } from "@/features/brainlover/BrainLoverRosterMinimized";
import { BrainLoverRosterExpanded } from "@/features/brainlover/BrainLoverRosterExpanded";
import type { TeamMember, RosterBrainLover } from "@/features/freebrainer/useTeamRoster";

export function BrainLoverTeamCard({
  team,
  memberCount,
  rank,
  userId,
  members,
  brainLoversByMember,
  selectedMemberId,
  onTeamJoined,
  onTeamUpdated,
  onLeftTeam,
}: {
  team: { id: string; name: string; slogan?: string | null; image_url?: string | null; code?: string | null } | null;
  memberCount: number;
  rank?: number;
  userId?: string;
  members?: TeamMember[];
  brainLoversByMember?: Record<string, RosterBrainLover[]>;
  selectedMemberId?: string | null;
  onTeamJoined?: (team: any) => void;
  onTeamUpdated?: (updated: any) => void;
  onLeftTeam?: () => void;
}) {
  const { t } = useTranslation();
  const [showRally, setShowRally] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  if (!team) {
    return (
      <>
        <Card className="border-dashed border-border">
          <CardContent className="p-6 text-center space-y-3">
            <div className="p-3 rounded-full bg-primary/10 w-fit mx-auto">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-foreground">
                {t("brainLoverResults.noTeam", "No team yet")}
              </p>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                {t("brainLoverResults.noTeamDesc", "Join an open team, enter a code, or start your own to rally together!")}
              </p>
            </div>
            <Button className="gap-2 font-bold" onClick={() => setShowJoin(true)}>
              <UserPlus className="h-4 w-4" />
              {t("brainLoverResults.joinOrStartTeam", "Join or Start a Team")}
            </Button>
          </CardContent>
        </Card>

        <RallyTeamModal
          isOpen={showJoin}
          onClose={() => setShowJoin(false)}
          userId={userId}
          onTeamJoined={(joinedTeam) => {
            setShowJoin(false);
            onTeamJoined?.(joinedTeam);
          }}
          title={t("brainLoverResults.joinOrCreateTeam", "Join or Create a Team")}
          description={t("brainLoverResults.searchOrCreateTeam", "Search for an open team, enter a code, or create your own.")}
        />
      </>
    );
  }

  return (
    <>
      <Card className="border-primary/30 shadow-sm">
        <CardContent className="p-4 space-y-3">
          {/* Header: team name + edit pencil */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-10 w-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden">
                {team.image_url ? (
                  <img src={team.image_url} alt={team.name} className="h-full w-full object-cover" />
                ) : (
                  team.name?.substring(0, 2).toUpperCase() || "TE"
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground truncate">{team.name}</p>
                {team.slogan && (
                  <p className="text-[10px] text-muted-foreground truncate italic">"{team.slogan}"</p>
                )}
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 shrink-0"
              onClick={() => setShowManage(true)}
              aria-label={t("brainLoverResults.editTeam", "Edit Team")}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              <span className="font-bold text-foreground">{memberCount}</span>
              {t("brainLoverResults.members", "members")}
            </span>
            {rank && (
              <Badge variant="secondary" className="text-[10px] font-bold">
                #{rank}
              </Badge>
            )}
          </div>

          {/* Roster — show all team members */}
          {members && members.length > 0 && (
            <div className="space-y-2 pt-1">
              {/* Selected FreeBrainer (expanded) */}
              {selectedMemberId && (() => {
                const expanded = members.find((m) => m.user_id === selectedMemberId);
                if (!expanded) return null;
                return (
                  <BrainLoverRosterExpanded
                    member={expanded}
                    brainLovers={brainLoversByMember?.[expanded.user_id] || []}
                  />
                );
              })()}
              {/* Other teammates (minimized) */}
              {members.filter((m) => m.user_id !== selectedMemberId).length > 0 && (
                <div className="space-y-1.5">
                  {members
                    .filter((m) => m.user_id !== selectedMemberId)
                    .map((m) => (
                      <BrainLoverRosterMinimized
                        key={m.user_id}
                        member={m}
                        brainLoverCount={(brainLoversByMember?.[m.user_id] || []).length}
                      />
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Rally button */}
          <Button
            className="w-full gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold"
            onClick={() => setShowRally(true)}
          >
            <Megaphone className="h-4 w-4" />
            {t("brainLoverResults.rallyTeam", "Rally Entire Team")}
          </Button>

          {/* Leave team — text link below rally */}
          <LeaveTeamButton
            teamId={team.id}
            teamName={team.name}
            overrideUserId={userId}
            onLeft={() => onLeftTeam?.()}
          />
        </CardContent>
      </Card>

      {/* Rally modal */}
      <RallyTeamToMoveModal
        isOpen={showRally}
        onClose={() => setShowRally(false)}
        teamId={team.id}
        teamName={team.name}
      />

      {/* Team management modal (edit only — leave is now inline) */}
      <Dialog open={showManage} onOpenChange={setShowManage}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              {t("brainLoverResults.editTeam", "Edit Team")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <TeamProfileEditor
              team={team}
              onTeamUpdated={(updated) => {
                onTeamUpdated?.(updated);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
