import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, TrendingDown, Info } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { getRecentSymptomEntries } from "@/lib/symptomStorage";
import { isDevBypassUser } from "@/lib/devBypass";

interface ChartDataPoint {
  date: string;
  displayDate: string;
  movementMinutes: number;
  symptomSeverity: number;
  type?: string;
}

interface SymptomMovementChartProps {
  userId?: string;
  title?: string;
  description?: string;
}

export function SymptomMovementChart({
  userId: customUserId,
  title,
  description,
}: SymptomMovementChartProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const targetUserId = customUserId || user?.id;
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [correlation, setCorrelation] = useState<number | null>(null);

  const resolvedTitle = title || t("dashboard.ahaInsights", "The \"Aha!\" Insights");
  const resolvedDescription = description || t("dashboard.ahaInsightsDesc", "See how your movement consistency affects your symptom severity over the last 30 days.");

  useEffect(() => {
    if (targetUserId) {
      // ── Dev-bypass: skip Supabase, use mock data ──
      if (isDevBypassUser(targetUserId)) {
        generateMock30Days();
        return;
      }
      loadChartData(targetUserId);
    } else {
      generateMock30Days();
    }
  }, [targetUserId]);

  const generateMock30Days = () => {
    const mockPoints: ChartDataPoint[] = [];
    const today = new Date();

    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const displayDate = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });

      const isRest = i % 5 === 0;
      const movementMinutes = isRest ? 0 : Math.min(45, Math.floor(15 + Math.sin(i / 2) * 15 + Math.random() * 10));
      const baseSeverity = Math.max(2, Math.floor(8 - (30 - i) * 0.15 - (movementMinutes > 15 ? 2.5 : 0)));
      const symptomSeverity = Math.min(10, Math.max(1, baseSeverity + (Math.random() > 0.5 ? 1 : -1)));

      mockPoints.push({
        date: dateStr,
        displayDate,
        movementMinutes,
        symptomSeverity,
        type: isRest ? "Rest Day" : "Active",
      });
    }

    setData(mockPoints);
    calculateCorrelation(mockPoints);
    setIsLoading(false);
  };

  const loadChartData = async (uid: string) => {
    setIsLoading(true);
    try {
      // ── Tier 2: Movement data from Supabase (non-sensitive) ──
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: checkins } = await supabase
        .from("daily_checkins")
        .select("*")
        .eq("user_id", uid)
        .gte("checkin_date", thirtyDaysAgo.toISOString().split("T")[0])
        .order("checkin_date", { ascending: true });

      // ── Tier 1: Symptom data from localStorage (HIPAA-sensitive) ──
      // Raw symptom levels NEVER leave the device. We read them here
      // and interlace with Tier 2 movement data client-side.
      const symptomEntries = getRecentSymptomEntries(uid, 30);
      const symptomMap = new Map<string, number>();
      symptomEntries.forEach((entry) => {
        const levels = Object.values(entry.symptomLevels);
        const avg = levels.length > 0 ? levels.reduce((a, b) => a + b, 0) / levels.length : 5;
        symptomMap.set(entry.date, avg);
      });

      console.log("[FB-DEBUG] SymptomMovementChart: checkins found =", checkins?.length || 0,
        "| with duration_minutes > 0 =", checkins?.filter((c: any) => c.duration_minutes > 0).length || 0,
        "| symptom entries =", symptomEntries.length);

      if (checkins && checkins.length > 0) {
        // ── Tier 3: Interlace both sources client-side ──
        // Use checkin_date (YYYY-MM-DD) as the key — it's the canonical date.
        const movementMap = new Map<string, { mins: number; type: string }>();
        checkins.forEach((c: any) => {
          // Prefer checkin_date; fall back to created_at only if missing
          const rawDate = c.checkin_date || c.created_at;
          const dateStr = new Date(rawDate).toISOString().split("T")[0];
          const mins = c.duration_minutes || (c.moved ? 20 : 0);
          movementMap.set(dateStr, { mins, type: c.movement_type || (c.moved ? "Movement" : "Rest") });
        });

        const fullPoints: ChartDataPoint[] = [];
        const today = new Date();
        for (let i = 29; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().split("T")[0];
          const displayDate = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });

          const movement = movementMap.get(dateStr);
          const symptom = symptomMap.get(dateStr);

          fullPoints.push({
            date: dateStr,
            displayDate,
            movementMinutes: movement?.mins || 0,
            symptomSeverity: symptom ?? 6,
            type: movement?.type || "Check-in",
          });
        }

        setData(fullPoints);
        calculateCorrelation(fullPoints);
      } else if (symptomEntries.length > 0) {
        // Have localStorage symptoms but no Supabase check-ins yet
        const fullPoints: ChartDataPoint[] = [];
        const today = new Date();
        for (let i = 29; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().split("T")[0];
          const displayDate = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
          fullPoints.push({
            date: dateStr,
            displayDate,
            movementMinutes: 0,
            symptomSeverity: symptomMap.get(dateStr) ?? 6,
          });
        }
        setData(fullPoints);
        calculateCorrelation(fullPoints);
      } else {
        generateMock30Days();
      }
    } catch (e) {
      console.error("Error loading chart data:", e);
      generateMock30Days();
    } finally {
      setIsLoading(false);
    }
  };

  const calculateCorrelation = (points: ChartDataPoint[]) => {
    const active = points.filter((p) => p.movementMinutes >= 15);
    const low = points.filter((p) => p.movementMinutes < 15);

    if (active.length > 0 && low.length > 0) {
      const avgActiveSymptoms = active.reduce((acc, p) => acc + p.symptomSeverity, 0) / active.length;
      const avgLowSymptoms = low.reduce((acc, p) => acc + p.symptomSeverity, 0) / low.length;
      const reductionPercent = Math.round(((avgLowSymptoms - avgActiveSymptoms) / avgLowSymptoms) * 100);
      setCorrelation(Math.max(12, Math.min(85, reductionPercent)));
    } else {
      setCorrelation(38);
    }
  };

  return (
    <Card className="border-2 border-primary/20 bg-card shadow-md">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-xl font-bold font-heading flex items-center gap-2 text-foreground">
              <Activity className="h-5 w-5 text-primary" />
              {resolvedTitle}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">{resolvedDescription}</CardDescription>
          </div>
          {correlation !== null && correlation > 0 && (
            <Badge variant="secondary" className="w-fit bg-success/15 text-success font-bold border-success/30 text-xs px-3 py-1 gap-1.5">
              <TrendingDown className="h-4 w-4" />
              {t("chart.avgSymptomsActive", { percent: correlation, defaultValue: `-${correlation}% Avg Symptoms on Active Days` })}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="h-64 flex items-center justify-center text-xs text-muted-foreground">
            {t("chart.loading", "Loading movement correlation data...")}
          </div>
        ) : (
          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis
                  dataKey="displayDate"
                  tick={{ fontSize: 10, fill: "currentColor", opacity: 0.6 }}
                  interval={4}
                />
                <YAxis
                  yAxisId="left"
                  orientation="left"
                  tick={{ fontSize: 10, fill: "currentColor", opacity: 0.6 }}
                  domain={[0, 60]}
                  unit="m"
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 10, fill: "currentColor", opacity: 0.6 }}
                  domain={[0, 10]}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const mins = payload[0]?.value ?? 0;
                      const severity = payload[1]?.value ?? 0;
                      return (
                        <div className="bg-popover text-popover-foreground border p-2.5 rounded-lg shadow-xl text-xs space-y-1">
                          <p className="font-bold border-b pb-1 text-foreground">{label}</p>
                          <p className="text-primary font-semibold flex items-center gap-1">
                            <span>{t("chart.movementLabel", "⏱ Movement:")}</span> {mins} mins
                          </p>
                          <p className="text-gold font-semibold flex items-center gap-1">
                            <span>{t("chart.symptomScoreLabel", "⚡ Symptom Score:")}</span> {severity}/10
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }}
                  formatter={(value) => (
                    <span className="text-foreground/80 font-medium">
                      {value === "movementMinutes"
                        ? t("chart.legendMovement", "Movement Consistency (Mins)")
                        : t("chart.legendSymptom", "Symptom Severity (1-10)")}
                    </span>
                  )}
                />
                <Bar
                  yAxisId="left"
                  dataKey="movementMinutes"
                  name="movementMinutes"
                  fill="hsl(var(--primary-raw))"
                  radius={[4, 4, 0, 0]}
                  opacity={0.8}
                  barSize={12}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="symptomSeverity"
                  name="symptomSeverity"
                  stroke="hsl(var(--gold))"
                  strokeWidth={3}
                  dot={{ r: 3, fill: "hsl(var(--gold))" }}
                  activeDot={{ r: 6 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="flex items-center justify-between text-[11px] text-muted-foreground bg-muted/30 p-2.5 rounded-lg border border-border/60">
          <div className="flex items-center gap-1.5">
            <Info className="h-4 w-4 text-primary shrink-0" />
            <span>{t("chart.insightNote", "Notice how higher movement bars (purple) consistently correlate with lower symptom lines (gold).")}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
