/**
 * TeamLeaderboard — the team ranking snippet card.
 *
 * Shows a 5-team window around the current user's team (2 above, 2 below).
 * Uses semantic tokens (primary for highlights).
 *
 * Props:
 *  - items: ranked LeaderboardTeam array
 *  - loading: whether data is still fetching
 *  - onBoost: callback to open the Raise Standing modal
 */
import { useTranslation } from "react-i18next";
import { Users, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { LeaderboardTeam } from "@/features/freebrainer/useLeaderboardData";

export function TeamLeaderboard({
  items,
  loading,
  onBoost,
}: {
  items: LeaderboardTeam[];
  loading: boolean;
  onBoost: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            {t("scoreboard.teamLeaderboard", "Team Leaderboard")}
          </CardTitle>
          <CardDescription className="text-xs">{t("scoreboard.teamDesc", "Your team's standing in the community")}</CardDescription>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={onBoost}
          className="text-xs text-primary font-bold hover:bg-primary/10 gap-1 h-8"
        >
          {t("scoreboard.raiseTeam", "Raise Team")} <ArrowUpRight className="h-3.5 w-3.5" />
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
            {t("scoreboard.noTeams", "No teams yet")}
          </p>
        ) : (
          items.map((team) => (
            <div
              key={team.teamId}
              className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                team.isCurrentTeam
                  ? "bg-primary/15 border-primary/50 shadow-md font-bold text-foreground scale-[1.02]"
                  : "bg-muted/20 border-border/60 text-muted-foreground text-xs"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-6 text-center font-black text-xs ${team.isCurrentTeam ? "text-primary" : ""}`}>
                  #{team.rank}
                </span>
                <div className="p-2 rounded-lg bg-primary/20 text-primary">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <div className={`text-xs ${team.isCurrentTeam ? "font-extrabold text-foreground" : "font-medium text-foreground"}`}>
                    {team.name}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{team.membersCount} {t("scoreboard.members", "Members")}</span>
                </div>
              </div>

              <div className="font-mono text-xs font-bold text-foreground">{team.score} {t("scoreboard.pts", "pts")}</div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
