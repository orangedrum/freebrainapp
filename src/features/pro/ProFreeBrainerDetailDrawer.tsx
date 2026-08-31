/**
 * ProFreeBrainerDetailDrawer — Slide-over drawer for deep-diving into an
 * individual FreeBrainer's data. Shows their insights chart (reuses the
 * shared SymptomMovementChart) and their 30-day check-in history.
 *
 * Tier compliance:
 * - Tier 2 (Supabase): Check-in history (dates, movement types, durations)
 * - Tier 1 (localStorage): Symptom data is read by SymptomMovementChart
 *   from the FreeBrainer's device — but since this is the Pro viewing from
 *   their own device, symptom data won't be available (it lives on the
 *   FreeBrainer's device). The chart will show movement-only data.
 *
 * i18n: `pro.detail.*` namespace.
 */
import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Activity, Flame } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { SymptomMovementChart } from "@/components/shared/SymptomMovementChart";

interface CheckInHistoryEntry {
  id: string;
  created_at: string;
  movement_type: string | null;
  duration_minutes: number | null;
  streak_count: number;
}

interface ProFreeBrainerDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  freeBrainerId: string | null;
  freeBrainerName: string | null;
  freeBrainerCondition: string | null;
}

export function ProFreeBrainerDetailDrawer({
  open,
  onOpenChange,
  freeBrainerId,
  freeBrainerName,
  freeBrainerCondition,
}: ProFreeBrainerDetailDrawerProps) {
  const { t } = useTranslation();
  const [history, setHistory] = useState<CheckInHistoryEntry[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [latestStreak, setLatestStreak] = useState(0);

  const loadHistory = useCallback(async (uid: string) => {
    setIsLoadingHistory(true);
    try {
      const { data } = await supabase
        .from("daily_checkins")
        .select("id, created_at, movement_type, duration_minutes, streak_count")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(30);

      setHistory((data || []) as CheckInHistoryEntry[]);

      if (data && data.length > 0) {
        setLatestStreak((data[0] as any).streak_count || 0);
      } else {
        setLatestStreak(0);
      }
    } catch (err) {
      console.error("Error loading check-in history:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (open && freeBrainerId) {
      loadHistory(freeBrainerId);
    } else {
      setHistory([]);
      setLatestStreak(0);
    }
  }, [open, freeBrainerId, loadHistory]);

  const formatDate = (isoStr: string) => {
    const d = new Date(isoStr);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle className="text-xl font-heading">
            {freeBrainerName || t("pro.detail.freeBrainerFallback")}
          </SheetTitle>
          <SheetDescription>
            {freeBrainerCondition
              ? freeBrainerCondition
              : t("pro.detail.noCondition")}
          </SheetDescription>
        </SheetHeader>

        {/* Quick stats row */}
        <div className="flex items-center gap-3 px-1 mt-2">
          <Badge variant="outline" className="gap-1.5 text-xs">
            <Flame className="h-3.5 w-3.5 text-orange-500" />
            {latestStreak} {t("pro.detail.dayStreak")}
          </Badge>
          <Badge variant="outline" className="gap-1.5 text-xs">
            <Calendar className="h-3.5 w-3.5 text-primary" />
            {history.length} {t("pro.detail.recentCheckins")}
          </Badge>
        </div>

        {/* Insights chart — reuses shared SymptomMovementChart */}
        <div className="mt-4">
          <SymptomMovementChart
            userId={freeBrainerId || undefined}
            title={t("pro.detail.insightsTitle")}
            description={t("pro.detail.insightsDesc")}
          />
        </div>

        {/* Check-in history list */}
        <div className="mt-4 space-y-3">
          <h3 className="font-heading font-bold text-sm flex items-center gap-2 text-foreground">
            <Activity className="h-4 w-4 text-primary" />
            {t("pro.detail.historyTitle")}
          </h3>

          {isLoadingHistory ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {t("pro.detail.noHistory")}
            </p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Calendar className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {formatDate(entry.created_at)}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {entry.movement_type
                          ? t(`checkin.${entry.movement_type}`, {
                              defaultValue: entry.movement_type,
                            })
                          : t("pro.detail.checkInRecorded")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {entry.duration_minutes != null && (
                      <Badge variant="outline" className="text-xs">
                        {entry.duration_minutes}m
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs gap-1">
                      <Flame className="h-3 w-3 text-orange-500" />
                      {entry.streak_count}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
