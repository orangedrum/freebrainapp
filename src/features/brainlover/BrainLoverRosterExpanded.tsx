/**
 * BrainLoverRosterExpanded — expanded roster row for the SELECTED FreeBrainer.
 *
 * Shows: avatar, name, condition badge, check-in status, streak, score,
 * rank, and full BrainLovers list (name + avatar + badge).
 *
 * Reuses RosterRow styling patterns but is a standalone BrainLover component
 * — no cheer/recommend actions (BrainLovers don't cheer other FreeBrainers here).
 *
 * @param member       — TeamMember data
 * @param brainLovers  — associated BrainLovers
 * @param rank         — individual rank (optional)
 */
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Check, AlertTriangle, Users } from "lucide-react";
import type { TeamMember, RosterBrainLover } from "@/features/freebrainer/useTeamRoster";

export function BrainLoverRosterExpanded({
  member,
  brainLovers,
  rank,
}: {
  member: TeamMember;
  brainLovers: RosterBrainLover[];
  rank?: number;
}) {
  const { t } = useTranslation();

  return (
    <Card className="border-primary/40 shadow-md">
      <CardContent className="p-4 space-y-3">
        {/* Header: avatar + name + condition + rank */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar className="h-10 w-10 shrink-0 border-2 border-primary/30">
              <AvatarImage src={member.avatar_url || undefined} alt={member.display_name} />
              <AvatarFallback className="text-sm font-bold bg-primary/20 text-primary">
                {member.display_name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-sm font-extrabold text-foreground truncate">
                {member.display_name}
              </span>
              {member.has_sos && (
                <Badge variant="destructive" className="text-[9px] px-1.5 py-0 shrink-0 gap-0.5">
                  <AlertTriangle className="h-2.5 w-2.5" />
                  {t("roster.sosBadge", "SOS")}
                </Badge>
              )}
              {member.condition && (
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 shrink-0 border-info/30 text-info">
                  {member.condition}
                </Badge>
              )}
            </div>
          </div>
          {rank && (
            <Badge variant="secondary" className="text-[10px] font-bold shrink-0">
              #{rank}
            </Badge>
          )}
        </div>

        {/* Status line: check-in + streak + pts */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground pl-[48px]">
          {member.checked_in_today ? (
            <span className="flex items-center gap-0.5 text-success font-semibold">
              <Check className="h-3 w-3" />
              {t("roster.checkedIn", "Checked in")}
            </span>
          ) : (
            <span>{t("roster.notYet", "Not yet")}</span>
          )}
          <span>•</span>
          <span className="flex items-center gap-0.5">
            {t("roster.streak", "Streak")}: <span className="font-bold text-foreground">{member.streak}</span>
          </span>
          <span>•</span>
          <span className="font-mono font-bold text-foreground">{member.total_score} {t("roster.pts", "pts")}</span>
        </div>

        {/* BrainLovers list */}
        {brainLovers.length > 0 && (
          <div className="pl-[48px] space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
              <Users className="h-3 w-3 text-primary" />
              {t("roster.brainLoversLabel", { count: brainLovers.length, defaultValue: "BrainLovers" })}
            </div>
            <div className="space-y-1.5">
              {brainLovers.map((bl) => (
                <div key={bl.caregiver_id} className="flex items-center gap-2 pl-5">
                  <Avatar className="h-6 w-6 shrink-0 border border-border/30">
                    <AvatarImage src={bl.avatar_url || undefined} alt={bl.display_name} />
                    <AvatarFallback className="text-[8px] font-bold">
                      {bl.display_name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-[11px] font-medium text-foreground truncate">
                    {bl.display_name}
                  </span>
                  <Badge variant="secondary" className="text-[8px] px-1.5 py-0 shrink-0">
                    {t("roster.brainLoverBadge", "BrainLover")}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
