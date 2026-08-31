/**
 * RankRow — a single team rank row in the leaderboard neighbor display.
 *
 * Extracted from TeamSection for modularity (ADR 001).
 */
import { useTranslation } from "react-i18next";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";

export interface RankRowProps {
  rank: number;
  name: string;
  score: number;
  isCurrent: boolean;
  direction?: "above" | "below";
}

export function RankRow({ rank, name, score, isCurrent, direction }: RankRowProps) {
  const { t } = useTranslation();
  return (
    <div
      className={`flex items-center justify-between rounded-lg px-3 py-2 transition-all ${
        isCurrent
          ? "bg-primary/15 border-2 border-primary/50 font-bold scale-[1.02]"
          : "bg-muted/20 border border-border/40 text-muted-foreground"
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className={`text-xs font-black ${isCurrent ? "text-primary" : ""}`}>
          #{rank}
        </span>
        {!isCurrent && direction === "above" && <ArrowUp className="h-3 w-3 text-muted-foreground shrink-0" />}
        {!isCurrent && direction === "below" && <ArrowDown className="h-3 w-3 text-muted-foreground shrink-0" />}
        {isCurrent && <Minus className="h-3 w-3 text-primary shrink-0" />}
        <span className={`text-xs truncate ${isCurrent ? "text-foreground font-extrabold" : ""}`}>
          {name}
        </span>
      </div>
      <span className={`text-xs font-mono font-bold ${isCurrent ? "text-foreground" : ""}`}>
        {score} {t("scoreboard.pts", "pts")}
      </span>
    </div>
  );
}
