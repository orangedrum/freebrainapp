/**
 * MonthlySummaryCard — "Your team of BrainLovers has helped [Name]
 * move N times this month" + streak + score + weekly rank.
 *
 * Reads from checkins (monthly count) + brainlover_interactions
 * (support count) + useBrainLoverLeaderboard (streak, score).
 *
 * @param patientId    — selected FreeBrainer's user_id
 * @param patientName  — display name
 * @param streak       — current streak (from leaderboard hook)
 * @param score        — FreeBrain score (from leaderboard hook)
 * @param weeklyRank   — team rank this week (optional)
 */
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, Flame, Trophy, Activity } from "lucide-react";
import { safeSupabaseQuery } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";
import { fetchBrainLoverInteractions } from "@/lib/brainloverInteractions";

interface MonthlyStats {
  monthlyMoves: number;
  supportCount: number;
}

export function MonthlySummaryCard({
  patientId,
  patientName,
  streak,
  score,
  weeklyRank,
}: {
  patientId: string | null | undefined;
  patientName?: string;
  streak: number;
  score: number;
  weeklyRank?: number;
}) {
  const { t } = useTranslation();
  const [stats, setStats] = useState<MonthlyStats>({ monthlyMoves: 0, supportCount: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patientId) {
      setStats({ monthlyMoves: 0, supportCount: 0 });
      setLoading(false);
      return;
    }

    let cancelled = false;
    const monthStart = new Date();
    monthStart.setDate(1);
    const monthStartStr = monthStart.toISOString().split("T")[0];

    const fetchStats = async () => {
      setLoading(true);
      try {
        const { data: checkins } = await safeSupabaseQuery<any>(() =>
          (supabase.from("daily_checkins") as any)
            .select("id")
            .eq("user_id", patientId)
            .eq("checkin_status", "moved")
            .gte("checkin_date", monthStartStr)
        );

        const monthlyMoves = checkins?.length || 0;

        const interactions = await fetchBrainLoverInteractions(patientId);
        const supportCount = interactions.filter((i) => {
          const d = new Date(i.created_at);
          return d >= monthStart;
        }).length;

        if (!cancelled) {
          setStats({ monthlyMoves, supportCount });
        }
      } catch (e) {
        console.warn("[FB-DEBUG] MonthlySummaryCard error:", e);
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
        <CardContent className="h-28" />
      </Card>
    );
  }

  return (
    <Card className="border-primary/30 shadow-sm">
      <CardContent className="p-4 sm:p-5 space-y-3">
        {/* Headline */}
        <div className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-primary shrink-0" />
          <p className="text-sm font-semibold text-foreground leading-snug">
            {t("brainLoverResults.monthlyHeadline", {
              name: patientName || "FreeBrainer",
              count: stats.monthlyMoves,
              defaultValue: `Your team of BrainLovers has helped ${patientName || "FreeBrainer"} move ${stats.monthlyMoves} times this month`,
            })}
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 pt-1">
          <div className="flex flex-col items-center gap-1 rounded-lg bg-muted/30 p-2">
            <Flame className="h-4 w-4 text-warning" />
            <span className="text-lg font-bold text-foreground">{streak}</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
              {t("brainLoverResults.streak", "Streak")}
            </span>
          </div>
          <div className="flex flex-col items-center gap-1 rounded-lg bg-muted/30 p-2">
            <Trophy className="h-4 w-4 text-gold" />
            <span className="text-lg font-bold text-foreground">{score}</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
              {t("brainLoverResults.score", "Score")}
            </span>
          </div>
          <div className="flex flex-col items-center gap-1 rounded-lg bg-muted/30 p-2">
            <Activity className="h-4 w-4 text-success" />
            <span className="text-lg font-bold text-foreground">
              {weeklyRank ? `#${weeklyRank}` : "—"}
            </span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
              {t("brainLoverResults.rank", "Rank")}
            </span>
          </div>
        </div>

        {/* Support count */}
        {stats.supportCount > 0 && (
          <p className="text-xs text-muted-foreground italic">
            {t("brainLoverResults.supportCount", {
              count: stats.supportCount,
              defaultValue: `${stats.supportCount} acts of support this month`,
            })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
