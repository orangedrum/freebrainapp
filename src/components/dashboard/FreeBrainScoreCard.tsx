/**
 * FreeBrainScoreCard — the "FreeBrain Score" card from the scoreboard.
 *
 * Shows the user's total points with a "Raise Standing" button.
 * Uses semantic tokens (primary for score accent).
 *
 * Props:
 *  - score: total FreeBrain points
 *  - onRaise: callback to open the Raise Standing modal
 */
import { useTranslation } from "react-i18next";
import { Trophy, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function FreeBrainScoreCard({
  score,
  onRaise,
}: {
  score: number;
  onRaise: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Card className="bg-gradient-to-br from-primary/15 via-primary/5 to-card border-primary/30 shadow-sm">
      <CardContent className="p-4 flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wider">
            <Trophy className="h-4 w-4" />
            {t("scoreboard.freeBrainScore", "FreeBrain Score")}
          </div>
          <div className="text-3xl sm:text-4xl font-black text-foreground flex items-baseline gap-2">
            <span>{score}</span>
            <span className="text-xs font-normal text-muted-foreground">{t("scoreboard.pts", "Pts")}</span>
          </div>
        </div>

        <Button
          onClick={onRaise}
          size="sm"
          className="text-xs gap-1.5 font-bold bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Zap className="h-3.5 w-3.5" />
          {t("scoreboard.raiseStanding", "Raise Standing")}
        </Button>
      </CardContent>
    </Card>
  );
}
