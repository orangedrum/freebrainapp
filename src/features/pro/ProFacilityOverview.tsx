/**
 * ProFacilityOverview — Aggregate stats card showing facility-wide metrics
 * across all managed FreeBrainers.
 *
 * Data comes from `useProRosterData` (Tier 2 Supabase only — no sensitive data).
 * Renders 4 stat tiles: total FreeBrainers, today's check-in rate, avg streak,
 * and longest active streak.
 *
 * i18n: `pro.facility.*` namespace.
 */
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, CheckCircle2, Flame, TrendingUp } from "lucide-react";
import type { FacilityStats } from "./useProRosterData";

interface ProFacilityOverviewProps {
  stats: FacilityStats;
  isLoading: boolean;
}

export function ProFacilityOverview({ stats, isLoading }: ProFacilityOverviewProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <Card className="p-4 sm:p-5">
        <Skeleton className="h-6 w-48 mb-4" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      </Card>
    );
  }

  if (stats.totalFreeBrainers === 0) {
    return null; // Nothing to show if no FreeBrainers
  }

  const tiles = [
    {
      icon: Users,
      label: t("pro.facility.totalFreeBrainers"),
      value: String(stats.totalFreeBrainers),
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      icon: CheckCircle2,
      label: t("pro.facility.checkInRate"),
      value: `${stats.checkInRate}%`,
      sublabel: `${stats.checkedInToday}/${stats.totalFreeBrainers} ${t("pro.facility.today")}`,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      icon: TrendingUp,
      label: t("pro.facility.avgStreak"),
      value: String(stats.avgStreak),
      sublabel: t("pro.facility.days"),
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      icon: Flame,
      label: t("pro.facility.longestStreak"),
      value: String(stats.longestStreak),
      sublabel: stats.longestStreakName
        ? stats.longestStreakName
        : undefined,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
    },
  ];

  return (
    <Card className="p-4 sm:p-5 space-y-4">
      <div>
        <h2 className="font-heading text-lg font-bold text-foreground">
          {t("pro.facility.title")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("pro.facility.subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tiles.map((tile, i) => {
          const Icon = tile.icon;
          return (
            <div
              key={i}
              className="flex flex-col gap-2 p-3 rounded-xl bg-muted/30 border border-border/30"
            >
              <div className="flex items-center gap-2">
                <div className={`h-8 w-8 rounded-lg ${tile.bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`h-4 w-4 ${tile.color}`} />
                </div>
                <span className="text-xs font-medium text-muted-foreground leading-tight">
                  {tile.label}
                </span>
              </div>
              <div>
                <span className="text-2xl font-bold text-foreground">{tile.value}</span>
                {tile.sublabel && (
                  <span className="text-xs text-muted-foreground ml-1">{tile.sublabel}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 30-day activity summary */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/20 p-2.5 rounded-lg border border-border/20">
        <TrendingUp className="h-4 w-4 text-primary shrink-0" />
        <span>
          {t("pro.facility.total30DayCheckins", { count: stats.total30DayCheckins })}
        </span>
      </div>
    </Card>
  );
}
