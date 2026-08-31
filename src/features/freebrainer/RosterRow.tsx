/**
 * RosterRow — a single teammate row in the team roster.
 *
 * Extracted from TeamRosterCard for modularity (ADR 001).
 *
 * Shows: avatar, name + condition badge, check-in status + pts (one line),
 * BrainLover sub-section (ADR 006), and right-aligned action buttons.
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, AlertTriangle, ChevronDown, ChevronUp, Users } from "lucide-react";
import type { TeamMember, RosterBrainLover } from "@/features/freebrainer/useTeamRoster";

export interface RosterRowProps {
  member: TeamMember;
  brainLovers: RosterBrainLover[];
  isCheering: boolean;
  onCheer: () => void;
  onRecommend: () => void;
  viewerRole: "freebrainer" | "brainlover";
  isOwnRow: boolean;
  isAssociatedFreeBrainer: boolean;
}

export function RosterRow({
  member,
  brainLovers,
  isCheering,
  onCheer,
  onRecommend,
  viewerRole,
  isOwnRow,
  isAssociatedFreeBrainer,
}: RosterRowProps) {
  const { t } = useTranslation();
  const [showBrainLovers, setShowBrainLovers] = useState(isOwnRow || isAssociatedFreeBrainer);

  const canSeeBrainLoverNames = isOwnRow || isAssociatedFreeBrainer;
  const blCount = brainLovers.length;

  return (
    <div className="rounded-xl border border-info/40 bg-muted/20 transition-all hover:bg-muted/30 p-3 space-y-2">
      {/* Top row: avatar + name/condition (left) + buttons (right) */}
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
            {member.has_sos && (
              <Badge variant="destructive" className="text-[9px] px-1.5 py-0 shrink-0 gap-0.5">
                <AlertTriangle className="h-2.5 w-2.5" />
                SOS
              </Badge>
            )}
            {member.condition && (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 shrink-0 border-info/30 text-info">
                {member.condition}
              </Badge>
            )}
          </div>
        </div>

        {/* Action buttons — right-aligned, vertically centered */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-3 rounded-lg border-gold/50 text-gold hover:bg-gold/10 font-bold text-xs"
            onClick={onCheer}
            disabled={isCheering}
            title={t("roster.cheerTitle", "Cheer")}
            aria-label={t("roster.cheerTitle", "Cheer")}
          >
            {t("roster.cheerTitle", "Cheer")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-3 rounded-lg border-info/40 text-info hover:bg-info/10 font-bold text-xs"
            onClick={onRecommend}
            title={t("roster.recommendVideo", "Recommend")}
            aria-label={t("roster.recommendVideo", "Recommend")}
          >
            {t("roster.recommendVideo", "Recommend")}
          </Button>
        </div>
      </div>

      {/* Status line: check-in + pts (one line, no streaks) */}
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
        <span className="font-mono font-bold text-foreground">{member.total_score} {t("roster.pts", "pts")}</span>
      </div>

      {/* ── BrainLover sub-section (ADR 006) ── */}
      {blCount > 0 && (
        <div className="pl-[42px]">
          {canSeeBrainLoverNames ? (
            <button
              className="flex items-center gap-1.5 w-full text-left text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShowBrainLovers(!showBrainLovers)}
              aria-expanded={showBrainLovers}
              aria-label={t("roster.brainLoversToggle", { count: blCount })}
            >
              <Users className="h-3 w-3 text-primary" />
              <span className="font-semibold">
                {t("roster.brainLoversLabel", { count: blCount, defaultValue: "BrainLovers" })}
              </span>
              {showBrainLovers ? (
                <ChevronUp className="h-3 w-3 ml-auto" />
              ) : (
                <ChevronDown className="h-3 w-3 ml-auto" />
              )}
            </button>
          ) : (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Users className="h-3 w-3 text-muted-foreground/60" />
              <span>
                {t("roster.brainLoverCount", { count: blCount })}
              </span>
            </div>
          )}

          {canSeeBrainLoverNames && showBrainLovers && (
            <div className="mt-1.5 space-y-1.5">
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
          )}
        </div>
      )}
    </div>
  );
}
