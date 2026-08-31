/**
 * StreakScoreCard — the "Current Streak" card from the scoreboard.
 *
 * Shows the user's active streak with a "Guilt-Free Rules?" button.
 * Uses semantic tokens (warning/gold for streak accent).
 *
 * Props:
 *  - streak: current consecutive check-in days
 *  - onShowRules: callback to open the Guilt-Free Rules modal
 */
import { useTranslation } from "react-i18next";
import { Flame } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function StreakScoreCard({
  streak,
  onShowRules,
}: {
  streak: number;
  onShowRules: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Card className="bg-gradient-to-br from-warning/10 via-warning/5 to-card border-warning/30 shadow-sm relative overflow-hidden">
      <CardContent className="p-4 flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-warning uppercase tracking-wider">
            <Flame className="h-4 w-4 fill-warning" />
            {t("scoreboard.currentStreak", "Current Streak")}
          </div>
          <div className="text-3xl sm:text-4xl font-black text-foreground flex items-baseline gap-2">
            <span>{streak} {t("scoreboard.days", "Days")}</span>
            <span className="text-xs font-normal text-muted-foreground">{t("scoreboard.active", "Active")}</span>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onShowRules}
          className="text-xs gap-1 border-warning/40 text-warning hover:bg-warning/10"
        >
          {t("scoreboard.guiltFreeRules", "Guilt-Free Rules?")}
        </Button>
      </CardContent>
    </Card>
  );
}
