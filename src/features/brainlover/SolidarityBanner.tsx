/**
 * SolidarityBanner — "You + N others supported [Name] today!"
 *
 * Reads today's brainlover_interactions from Supabase (community_posts
 * with type LIKE 'brainlover_%') for the selected FreeBrainer.
 * Falls back to localStorage in dev-bypass mode.
 *
 * If alone (only this BrainLover), shows "You're [Name]'s BrainLover today!"
 * Green accent — celebratory, not alarming.
 */
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Users, Heart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { safeSupabaseQuery, supabase } from "@/lib/supabase";

interface SolidarityBannerProps {
  patientId: string;
  patientName: string;
  caregiverId: string;
}

export function SolidarityBanner({ patientId, patientName, caregiverId }: SolidarityBannerProps) {
  const { t } = useTranslation();
  const [supporterCount, setSupporterCount] = useState(1);
  const [loading, setLoading] = useState(true);

  const firstName = patientName.split(" ")[0];

  useEffect(() => {
    if (!patientId) {
      setSupporterCount(1);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const fetchSupporters = async () => {
      setLoading(true);
      try {
        const todayStr = new Date().toISOString().split("T")[0];
        const { data } = await safeSupabaseQuery<any>(() =>
          (supabase.from("community_posts") as any)
            .select("posted_by_id")
            .eq("user_id", patientId)
            .ilike("type", "brainlover_%")
            .gte("created_at", `${todayStr}T00:00:00.000Z`)
        );

        if (cancelled) return;

        if (data && data.length > 0) {
          const uniqueSenders = new Set(
            data.map((p: any) => p.posted_by_id).filter(Boolean)
          );
          setSupporterCount(uniqueSenders.size || 1);
        } else {
          setSupporterCount(1);
        }
      } catch (e) {
        setSupporterCount(1);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchSupporters();
    return () => { cancelled = true; };
  }, [patientId, caregiverId]);

  if (loading) {
    return (
      <Card className="border-success/20 bg-success/5 animate-pulse">
        <CardContent className="h-12" />
      </Card>
    );
  }

  const isAlone = supporterCount <= 1;

  return (
    <Card className="border-success/30 bg-success/5 shadow-sm">
      <CardContent className="flex items-center gap-3 py-3 px-4">
        <div className="h-10 w-10 rounded-full bg-success/15 flex items-center justify-center shrink-0">
          {isAlone ? (
            <Heart className="h-5 w-5 text-success fill-success/20" />
          ) : (
            <Users className="h-5 w-5 text-success" />
          )}
        </div>
        <p className="text-sm font-semibold text-success-foreground">
          {isAlone
            ? t("solidarityBanner.alone", "You're {{name}}'s BrainLover today!", { name: firstName })
            : t("solidarityBanner.supported", "You + {{count}} others supported {{name}} today!", { count: supporterCount - 1, name: firstName })}
        </p>
      </CardContent>
    </Card>
  );
}
