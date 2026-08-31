/**
 * LatestAhaInsight — compact card showing the FreeBrainer's most recent
 * Aha Insight from their check-in data.
 *
 * Fetches the latest check-in with a non-empty aha_insight field.
 * Falls back to a motivational placeholder if no insights yet.
 *
 * Reuses daily_checkins table. Dev-bypass safe.
 */
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Lightbulb, Loader2, ChevronRight } from "lucide-react";
import { safeSupabaseQuery, supabase } from "@/lib/supabase";

interface LatestAhaInsightProps {
  patientId: string;
  patientName: string;
}

export function LatestAhaInsight({ patientId, patientName }: LatestAhaInsightProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const firstName = patientName.split(" ")[0];

  useEffect(() => {
    if (!patientId) {
      setInsight(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const fetchInsight = async () => {
      setLoading(true);
      try {
        const { data } = await safeSupabaseQuery<any>(() =>
          (supabase.from("daily_checkins") as any)
            .select("aha_insight, created_at")
            .eq("user_id", patientId)
            .not("aha_insight", "is", null)
            .neq("aha_insight", "")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()
        );

        if (cancelled) return;
        setInsight(data?.aha_insight || null);
      } catch (e) {
        if (!cancelled) setInsight(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchInsight();
    return () => { cancelled = true; };
  }, [patientId]);

  if (loading) {
    return (
      <Card className="border-gold/20 bg-gold/5 animate-pulse">
        <CardContent className="h-16" />
      </Card>
    );
  }

  return (
    <Card
      className="border-gold/20 bg-gold/5 shadow-sm cursor-pointer hover:border-gold/40 hover:bg-gold/10 transition-colors"
      onClick={() => navigate("/updates?tab=results")}
    >
      <CardContent className="flex items-start gap-3 py-3 px-4">
        <div className="h-9 w-9 rounded-full bg-gold/15 flex items-center justify-center shrink-0">
          <Lightbulb className="h-5 w-5 text-gold" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
            {t("latestAha.title", "{{name}}'s Latest Aha!", { name: firstName })}
          </p>
          <p className="text-sm text-foreground line-clamp-2">
            {insight || t("latestAha.placeholder", "No insights logged yet — keep moving!")}
          </p>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 self-center" />
      </CardContent>
    </Card>
  );
}
