/**
 * useLinkedFreeBrainers — Reusable hook to fetch FreeBrainers linked to the
 * current caregiver/Pro. Deduplicates the Supabase queries that were
 * previously inlined in both CreatePostModal and Community.tsx.
 *
 * Returns a list of { id, display_name } for the linked FreeBrainers.
 */
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

export interface LinkedFreeBrainer {
  id: string;
  display_name: string;
}

export function useLinkedFreeBrainers(enabled: boolean = true) {
  const { user, userRole } = useAuth();
  const [freeBrainers, setFreeBrainers] = useState<LinkedFreeBrainer[]>([]);
  const [loading, setLoading] = useState(false);

  const isCaregiver =
    userRole === "caregiver" ||
    userRole === "brainlover" ||
    userRole === "caregiver_pro" ||
    userRole === "admin";

  useEffect(() => {
    if (!enabled || !user || !isCaregiver) return;

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const { data: links } = await supabase
          .from("caregiver_links")
          .select("patient_id")
          .eq("caregiver_id", user!.id);

        if (cancelled) return;

        if (links && links.length > 0) {
          const patientIds = links.map((l: any) => l.patient_id);
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, display_name")
            .in("user_id", patientIds);

          if (cancelled) return;

          if (profiles) {
            const list = profiles.map((p: any) => ({
              id: p.user_id,
              display_name: p.display_name || "FreeBrainer",
            }));
            setFreeBrainers(list);
          }
        }
      } catch (err) {
        console.error("Failed to load linked FreeBrainers:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, user, isCaregiver]);

  return { freeBrainers, loading, isCaregiver };
}
