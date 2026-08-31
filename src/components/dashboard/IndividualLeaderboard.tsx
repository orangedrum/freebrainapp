/**
 * IndividualLeaderboard — the individual ranking snippet card.
 *
 * Shows a 5-person window around the current user (2 above, 2 below).
 * Uses semantic tokens (primary for highlights, gold for trophy icon).
 *
 * Props:
 *  - items: ranked LeaderboardUser array
 *  - loading: whether data is still fetching
 *  - onBoost: callback to open the Raise Standing modal
 */
import { useTranslation } from "react-i18next";
import { Trophy, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarUrl } from "@/lib/avatar";
import type { LeaderboardUser } from "@/features/freebrainer/useLeaderboardData";

export function IndividualLeaderboard({
  items,
  loading,
  onBoost,
}: {
  items: LeaderboardUser[];
  loading: boolean;
  onBoost: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Trophy className="h-4 w-4 text-gold" />
            {t("scoreboard.individualLeaderboard", "Individual Leaderboard")}
          </CardTitle>
          <CardDescription className="text-xs">{t("scoreboard.individualDesc", "Your standing flanked by top peers")}</CardDescription>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={onBoost}
          className="text-xs text-primary font-bold hover:bg-primary/10 gap-1 h-8"
        >
          {t("scoreboard.boost", "Boost")} <ArrowUpRight className="h-3.5 w-3.5" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 rounded-xl bg-muted/20 animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            {t("scoreboard.noData", "No leaderboard data yet")}
          </p>
        ) : (
          items.map((item) => (
            <div
              key={item.userId}
              className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                item.isCurrentUser
                  ? "bg-primary/15 border-primary/50 shadow-md font-bold text-foreground scale-[1.02]"
                  : "bg-muted/20 border-border/60 text-muted-foreground text-xs"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-6 text-center font-black text-xs ${item.isCurrentUser ? "text-primary" : ""}`}>
                  #{item.rank}
                </span>
                <Avatar className={`h-8 w-8 ${item.isCurrentUser ? "ring-2 ring-primary" : ""}`}>
                  <AvatarImage src={item.avatar || getAvatarUrl(item.name)} />
                  <AvatarFallback className="bg-primary/20 text-primary font-bold text-xs">
                    {item.name[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className={`text-xs ${item.isCurrentUser ? "font-extrabold text-foreground" : "font-medium text-foreground"}`}>
                    {item.name} {item.isCurrentUser && `(${t("scoreboard.you", "You")})`}
                  </div>
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-primary/30 text-primary">
                    {item.condition}
                  </Badge>
                </div>
              </div>

              <div className="font-mono text-xs font-bold text-foreground">{item.score} {t("scoreboard.pts", "pts")}</div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
