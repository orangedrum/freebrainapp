/**
 * BrainLoverStreakRatioCard — "30-Day Ratio" card for the BrainLover dashboard.
 *
 * Shows the selected FreeBrainer's 30-day movement breakdown
 * (Freed / Tested / Rested) in a single compact card.
 *
 * This is a BrainLover-specific variant of StreakRatioCard that queries
 * the selected FreeBrainer's check-in data from Supabase (not the
 * logged-in user's data).
 *
 * @param patientId — the selected FreeBrainer's user_id
 */
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { safeSupabaseQuery } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Flame, Activity, Bed } from "lucide-react";

interface Stats { moved: number; rest: number; flare: number; }

export function BrainLoverStreakRatioCard({
  patientId,
}: {
  patientId: string | null | undefined;
}) {
  const { t } = useTranslation();
  const [stats, setStats] = useState<Stats>({ moved: 0, rest: 0, flare: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patientId) {
      setStats({ moved: 0, rest: 0, flare: 0 });
      setLoading(false);
      return;
    }

    let cancelled = false;
    const fetchStats = async () => {
      setLoading(true);
      try {
        // Fetch last 30 days of check-ins for this FreeBrainer
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const dateStr = thirtyDaysAgo.toISOString().split("T")[0];

        const { data: checkins } = await safeSupabaseQuery<any>(() =>
          (supabase.from("daily_checkins") as any)
            .select("checkin_status, moved")
            .eq("user_id", patientId)
            .gte("checkin_date", dateStr)
        );

        if (cancelled) return;

        const newStats: Stats = { moved: 0, rest: 0, flare: 0 };
        (checkins || []).forEach((c: any) => {
          if (c.checkin_status === "moved" || c.moved) newStats.moved++;
          else if (c.checkin_status === "rest_day") newStats.rest++;
          else if (c.checkin_status === "flare_up") newStats.flare++;
        });

        setStats(newStats);
      } catch (e) {
        console.warn("[FB-DEBUG] BrainLover streak ratio error:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchStats();
    return () => { cancelled = true; };
  }, [patientId]);

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="h-24" />
      </Card>
    );
  }

  return (
    <Card className="border-primary/30 shadow-sm">
      <CardContent className="p-4 sm:p-5">
        <div className="space-y-1.5">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {t("checkin.ratio30Day", "30-Day Ratio")}
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-success" /> {t("checkin.moved", "I Moved Today")}
            </span>
            <span className="font-bold">{stats.moved}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-warning" /> {t("checkin.flareUp", "Tested My Brain")}
            </span>
            <span className="font-bold">{stats.flare}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="flex items-center gap-2">
              <Bed className="h-4 w-4 text-info" /> {t("checkin.restDay", "Rested My Brain")}
            </span>
            <span className="font-bold">{stats.rest}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
