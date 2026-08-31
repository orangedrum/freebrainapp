/**
 * FreeBrainerLoveSection — encouragement from fellow FreeBrainers (teammates).
 *
 * Shows team rallies and SOS alerts from teammates on the Love page.
 * Each item links to the Community Wall for response.
 *
 * Key behaviors:
 *  - SOS alerts use danger styling (red).
 *  - Rallies use info styling (blue).
 *  - Both can be visually dismissed (removed from local list).
 *  - Empty state shows a warm message.
 *
 * Reuses: TeamRallyAlert data from `teamRally.ts` via `useLoveInteractions`.
 */
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Megaphone, ShieldAlert, X, ArrowRight } from "lucide-react";
import { useLoveInteractions, type LoveItem } from "@/features/freebrainer/useLoveInteractions";

interface FreeBrainerLoveSectionProps {
  userId?: string;
  teamId?: string | null;
}

export function FreeBrainerLoveSection({ userId, teamId }: FreeBrainerLoveSectionProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { items, loading, dismissRally } = useLoveInteractions(userId, teamId);

  // Filter to only team rally interactions (not BrainLover)
  const teamItems = items.filter((i) => i.isTeamRally);

  return (
    <Card className="border-info/20">
      <CardContent className="p-4 sm:p-5 space-y-4">
        {/* Section header */}
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-info/15 text-info">
            <Users className="h-4 w-4" />
          </div>
          <h3 className="font-bold text-sm sm:text-base text-foreground">
            {t("love.fromFreeBrainers", "From Your FreeBrainers")}
          </h3>
        </div>

{/* Content */}
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t("love.loading")}
          </p>
        ) : teamItems.length === 0 ? (
          <div className="text-center py-6 space-y-3">
            <div className="p-3 rounded-full bg-info/10 w-fit mx-auto">
              <Users className="h-7 w-7 text-info" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-foreground">
                {t("love.emptyTeamTitle", "No team activity yet")}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
                {t("love.emptyTeamDesc", "Rallies and SOS alerts from your teammates will appear here.")}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {teamItems.map((item) => (
              <TeamLoveCard
                key={item.id}
                item={item}
                onDismiss={() => dismissRally(item.id)}
                onGoToCommunity={() => navigate("/community")}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Individual team love card ─────────────────────────────────

interface TeamLoveCardProps {
  item: LoveItem;
  onDismiss: () => void;
  onGoToCommunity: () => void;
}

function TeamLoveCard({ item, onDismiss, onGoToCommunity }: TeamLoveCardProps) {
  const { t } = useTranslation();
  const isSos = item.type === "sos";

  return (
    <Card className={`border-2 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300 ${
      isSos ? "border-danger bg-danger/10" : "border-info bg-info/10"
    }`}>
      <CardContent className="p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl shrink-0 ${
            isSos ? "bg-danger/20 text-danger" : "bg-info/20 text-info"
          }`}>
            {isSos ? <ShieldAlert className="h-6 w-6" /> : <Megaphone className="h-6 w-6" />}
          </div>
          <div>
            <h4 className="font-bold text-sm sm:text-base">
              {isSos
                ? t("love.sosTitle", { name: item.senderName })
                : t("love.rallyTitle", { name: item.senderName })}
            </h4>
            {item.message && (
              <p className="text-xs text-muted-foreground italic line-clamp-2 mt-0.5">
                "{item.message}"
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            className={`gap-1.5 font-bold text-xs ${
              isSos ? "bg-danger hover:bg-danger/90" : "bg-info hover:bg-info/90"
            }`}
            onClick={onGoToCommunity}
          >
            {t("love.respondOnWall")} <ArrowRight className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-xs font-semibold shrink-0"
            onClick={onDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
