/**
 * ProRosterTable — Table view of all FreeBrainers linked to a BrainLover Pro.
 *
 * Data is provided by the parent via `roster` + `isLoading` props (from the
 * shared `useProRosterData` hook) so that ProFacilityOverview and this table
 * share a single fetch. Rows are clickable to open the detail drawer.
 *
 * i18n: `pro.*` namespace.
 */
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { RosterEntry } from "./useProRosterData";

interface ProRosterTableProps {
  roster: RosterEntry[];
  isLoading: boolean;
  onRowClick?: (entry: RosterEntry) => void;
}

export function ProRosterTable({ roster, isLoading, onRowClick }: ProRosterTableProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <Card className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </Card>
    );
  }

  if (roster.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">
          {t("pro.noFreeBrainers", "No FreeBrainers linked yet. Invite FreeBrainers to your roster to begin monitoring their progress.")}
        </p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="p-4 border-b border-border/40">
        <h2 className="font-heading text-lg font-bold text-foreground">
          {t("pro.rosterTitle", "FreeBrainer Roster")}
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {t("pro.rosterSubtitle", "{{count}} FreeBrainer(s) under your care", { count: roster.length })}
        </p>
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/30">
            <tr className="text-left text-muted-foreground">
              <th className="px-4 py-3 font-semibold">{t("pro.colName", "Name")}</th>
              <th className="px-4 py-3 font-semibold">{t("pro.colCondition", "Condition")}</th>
              <th className="px-4 py-3 font-semibold">{t("pro.colCheckIn", "Today's Check-in")}</th>
              <th className="px-4 py-3 font-semibold">{t("pro.colStreak", "Streak")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {roster.map((entry) => (
              <tr
                key={entry.user_id}
                className={`hover:bg-muted/10 transition-colors${onRowClick ? " cursor-pointer" : ""}`}
                onClick={() => onRowClick?.(entry)}
              >
                <td className="px-4 py-3 font-medium text-foreground">
                  {entry.display_name}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {entry.condition || t("pro.notSpecified", "Not specified")}
                </td>
                <td className="px-4 py-3">
                  {entry.has_checked_in_today ? (
                    <Badge className="bg-green-500/20 text-green-700 border-green-500/30">
                      {t("pro.checkedIn", "Checked In")}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      {t("pro.notYet", "Not yet")}
                    </Badge>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="font-bold text-foreground">{entry.streak}</span>{" "}
                  <span className="text-muted-foreground text-xs">
                    {t("pro.dayStreak", "day streak")}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden divide-y divide-border/30">
        {roster.map((entry) => (
          <div
            key={entry.user_id}
            className={`p-4 space-y-2${onRowClick ? " cursor-pointer hover:bg-muted/10 transition-colors" : ""}`}
            onClick={() => onRowClick?.(entry)}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-foreground">{entry.display_name}</span>
              {entry.has_checked_in_today ? (
                <Badge className="bg-green-500/20 text-green-700 border-green-500/30 text-xs">
                  {t("pro.checkedIn", "Checked In")}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground text-xs">
                  {t("pro.notYet", "Not yet")}
                </Badge>
              )}
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {entry.condition || t("pro.notSpecified", "Not specified")}
              </span>
              <span>
                <span className="font-bold text-foreground">{entry.streak}</span>{" "}
                <span className="text-muted-foreground text-xs">
                  {t("pro.dayStreak", "day streak")}
                </span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
