/**
 * BrainLoverRosterMinimized — compact roster row for OTHER team FreeBrainers
 * (not the selected one).
 *
 * Shows: avatar, name, condition badge, check-in status, streak, and
 * BrainLover count (just a number, no names).
 *
 * No action buttons — BrainLovers can only rally the whole team, not
 * cheer individual FreeBrainers from this view.
 *
 * @param member       — TeamMember data
 * @param brainLoverCount — number of BrainLovers supporting this FreeBrainer
 */
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Check, Users } from "lucide-react";
import type { TeamMember } from "@/features/freebrainer/useTeamRoster";

export function BrainLoverRosterMinimized({
  member,
  brainLoverCount,
}: {
  member: TeamMember;
  brainLoverCount: number;
}) {
  const { t } = useTranslation();

  return (
    <div className="rounded-xl border border-info/40 bg-muted/20 p-3 space-y-1.5">
      {/* Top row: avatar + name/condition */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <Avatar className="h-8 w-8 shrink-0 border-2 border-info/30">
            <AvatarImage src={member.avatar_url || undefined} alt={member.display_name} />
            <AvatarFallback className="text-xs font-bold bg-info/20 text-info">
              {member.display_name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs font-extrabold text-foreground truncate">
              {member.display_name}
            </span>
            {member.condition && (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 shrink-0 border-info/30 text-info">
                {member.condition}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Status line */}
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground pl-[42px]">
        {member.checked_in_today ? (
          <span className="flex items-center gap-0.5 text-success font-semibold">
            <Check className="h-3 w-3" />
            {t("roster.checkedIn", "Checked in")}
          </span>
        ) : (
          <span>{t("roster.notYet", "Not yet")}</span>
        )}
        <span>•</span>
        <span>{t("roster.streak", "Streak")}: <span className="font-bold text-foreground">{member.streak}</span></span>
      </div>

      {/* BrainLover count */}
      {brainLoverCount > 0 && (
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pl-[42px]">
          <Users className="h-3 w-3 text-muted-foreground/60" />
          <span>
            {t("roster.brainLoverCount", { count: brainLoverCount })}
          </span>
        </div>
      )}
    </div>
  );
}
