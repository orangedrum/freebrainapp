/**
 * StreakRatioCard — "30-Day Ratio" card.
 *
 * Shows the user's 30-day movement breakdown (Freed / Tested / Rested)
 * in a single compact card. The current streak is displayed separately
 * in the TabbedLeaderboardSection below.
 *
 * Data tier: Tier 2 (social) — streaks and check-in counts come from
 * Supabase via the useCheckInData hook.
 */
import { useCheckInData } from "@/features/checkin/useCheckInData";
import { Card, CardContent } from "@/components/ui/card";
import { Flame, Activity, Bed } from "lucide-react";
import { useTranslation } from "react-i18next";

export function StreakRatioCard() {
  const { t } = useTranslation();
  const ci = useCheckInData();

  if (ci.isFetching) {
    return (
      <Card className="animate-pulse">
        <CardContent className="h-24" />
      </Card>
    );
  }

  return (
    <Card className="border-primary/30 shadow-sm">
      <CardContent className="p-4 sm:p-5">
        {/* 30-Day Ratio */}
        <div className="space-y-1.5">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {t("checkin.ratio30Day", "30-Day Ratio")}
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-success" /> {t("checkin.moved", "I Moved Today")}
            </span>
            <span className="font-bold">{ci.stats.moved}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-warning" /> {t("checkin.flareUp", "Tested My Brain")}
            </span>
            <span className="font-bold">{ci.stats.flare}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="flex items-center gap-2">
              <Bed className="h-4 w-4 text-info" /> {t("checkin.restDay", "Rested My Brain")}
            </span>
            <span className="font-bold">{ci.stats.rest}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
