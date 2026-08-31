/**
 * useConnectedBrainLovers — fetches the BrainLovers (caregivers) linked to a FreeBrainer.
 *
 * Queries the `caregiver_links` table for rows where `patient_id` = the FreeBrainer's
 * user ID, then joins to `profiles` to get display names and avatars.
 *
 * Data tier: Tier 2 (social) — caregiver links are non-sensitive relationship data.
 *
 * Reuses the same query pattern as `useProfileData.fetchProfileData` (lines 220-248)
 * but extracted into its own hook so the Love page can use it independently.
 */
import { useState, useEffect, useCallback } from "react";
import { supabase, safeSupabaseQuery } from "@/lib/supabase";

export interface ConnectedBrainLover {
  caregiver_id: string;
  display_name: string;
  avatar_url?: string;
}

export function useConnectedBrainLovers(userId?: string) {
  const [brainLovers, setBrainLovers] = useState<ConnectedBrainLover[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) {
      setBrainLovers([]);
      setLoading(false);
      return;
    }

    try {
      const { data: rawLinks } = await safeSupabaseQuery<any>(() =>
        (supabase.from("caregiver_links") as any)
          .select("caregiver_id")
          .eq("patient_id", userId)
      );

      if (rawLinks && rawLinks.length > 0) {
        const caregiverIds = rawLinks.map((l: any) => l.caregiver_id);
        const { data: profiles } = await safeSupabaseQuery<any>(() =>
          (supabase.from("profiles") as any)
            .select("user_id, display_name, avatar_url")
            .in("user_id", caregiverIds)
        );

        const result: ConnectedBrainLover[] = rawLinks.map((link: any) => {
          const prof = profiles?.find((p: any) => p.user_id === link.caregiver_id);
          return {
            caregiver_id: link.caregiver_id,
            display_name: prof?.display_name || "BrainLover",
            avatar_url: prof?.avatar_url,
          };
        });

        setBrainLovers(result);
        // Cache for dev-bypass mode
        localStorage.setItem(
          `dev_patient_links_${userId}`,
          JSON.stringify(
            rawLinks.map((link: any) => ({
              caregiver_id: link.caregiver_id,
              profiles: profiles?.find((p: any) => p.user_id === link.caregiver_id) || {
                display_name: "BrainLover",
              },
            }))
          )
        );
      } else {
        setBrainLovers([]);
      }
    } catch (e) {
      console.warn("[FB-DEBUG] useConnectedBrainLovers error:", e);
      // Try cache
      const cached = localStorage.getItem(`dev_patient_links_${userId}`);
      if (cached) {
        try {
          const parsed: any[] = JSON.parse(cached);
          setBrainLovers(
            parsed.map((link) => ({
              caregiver_id: link.caregiver_id,
              display_name: link.profiles?.display_name || "BrainLover",
            }))
          );
        } catch {
          setBrainLovers([]);
        }
      } else {
        setBrainLovers([]);
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  return { brainLovers, loading, refetch: load };
}
