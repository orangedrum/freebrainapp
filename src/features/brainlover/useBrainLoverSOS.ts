/**
 * useBrainLoverSOS — checks whether the selected FreeBrainer has
 * triggered an SOS / Hard Day alert today.
 *
 * Checks:
 *  1. Supabase community_posts for type='sos' from the patient today
 *  2. localStorage cache of team rallies (dev-bypass fallback)
 *
 * Returns { hasSOS, loading }
 */
import { useState, useEffect } from "react";
import { safeSupabaseQuery, supabase } from "@/lib/supabase";

export function useBrainLoverSOS(patientId: string | null | undefined) {
  const [hasSOS, setHasSOS] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patientId) {
      setHasSOS(false);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const checkSOS = async () => {
      setLoading(true);
      try {
        const todayStr = new Date().toISOString().split("T")[0];
        const { data } = await safeSupabaseQuery<any>(() =>
          (supabase.from("community_posts") as any)
            .select("id")
            .eq("user_id", patientId)
            .eq("type", "sos")
            .gte("created_at", `${todayStr}T00:00:00.000Z`)
            .limit(1)
        );
        if (!cancelled) setHasSOS(!!(data && data.length > 0));
      } catch (e) {
        // Fallback: check localStorage
        try {
          const ralliesStr = localStorage.getItem("fb_active_team_rallies");
          if (ralliesStr) {
            const rallies = JSON.parse(ralliesStr);
            const todayStr = new Date().toISOString().split("T")[0];
            setHasSOS(rallies.some((r: any) =>
              r.author_id === patientId && r.type === "sos" && r.created_at.startsWith(todayStr)
            ));
          }
        } catch (e2) {}
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    checkSOS();
    return () => { cancelled = true; };
  }, [patientId]);

  return { hasSOS, loading };
}
