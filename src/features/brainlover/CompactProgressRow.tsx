/**
 * CompactProgressRow — 3-column compact row showing the FreeBrainer's
 * streak, FreeBrain score, and monthly movement count.
 *
 * Reuses useBrainLoverLeaderboard for streak + score data, and fetches
 * the monthly count from daily_checkins.
 *
 * @param patientId — the selected FreeBrainer's user_id
 */
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Flame, Star, Calendar } from "lucide-react";
import { useBrainLoverLeaderboard } from "./useBrainLoverLeaderboard";
import { safeSupabaseQuery, supabase } from "@/lib/supabase";

interface CompactProgressRowProps {
  patientId: string;
  refreshKey?: number;
}

export function CompactProgressRow({ patientId, refreshKey }: CompactProgressRowProps) {
  const { t } = useTranslation();
  const { currentStreak, freeBrainScore } = useBrainLoverLeaderboard(patientId, refreshKey);
  const [monthlyCount, setMonthlyCount] = useState(0);

  useEffect(() => {
    if (!patientId) {
      setMonthlyCount(0);
      return;
    }

    let cancelled = false;
    const fetchMonthly = async () => {
      try {
        const now = new Date();
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const dateStr = firstOfMonth.toISOString().split("T")[0];

        const { data } = await safeSupabaseQuery<any>(() =>
          (supabase.from("daily_checkins") as any)
            .select("id")
            .eq("user_id", patientId)
            .eq("moved", true)
            .gte("checkin_date", dateStr)
        );

        if (!cancelled) setMonthlyCount(data?.length || 0);
      } catch (e) {
        if (!cancelled) setMonthlyCount(0);
      }
    };
    fetchMonthly();
    return () => { cancelled = true; };
  }, [patientId, refreshKey]);

  const items = [
    {
      icon: Flame,
      label: t("compactProgress.streak", "Streak"),
      value: currentStreak,
      color: "text-warning",
      bg: "bg-warning/10",
    },
    {
      icon: Star,
      label: t("compactProgress.score", "Score"),
      value: freeBrainScore,
      color: "text-gold",
      bg: "bg-gold/10",
    },
    {
      icon: Calendar,
      label: t("compactProgress.month", "This Month"),
      value: monthlyCount,
      color: "text-success",
      bg: "bg-success/10",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map((item, i) => (
        <Card key={i} className="border-border/50 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-3 px-2 gap-1">
            <div className={`h-8 w-8 rounded-full ${item.bg} flex items-center justify-center`}>
              <item.icon className={`h-4 w-4 ${item.color}`} />
            </div>
            <span className="text-xl font-extrabold text-foreground">{item.value}</span>
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              {item.label}
            </span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
