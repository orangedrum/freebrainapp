/**
 * useVirtualSessions.ts
 *
 * Data hook for the VirtualSessionCalendar component.
 * Reads from Supabase `virtual_sessions` table (Tier 2 — social data).
 * No Tier 1 (sensitive) data is touched.
 *
 * @param freebrainerEmail — the email to filter sessions by
 */
import { useState, useEffect, useCallback } from "react";
import { supabase, safeSupabaseQuery } from "@/lib/supabase";

export interface VirtualSession {
  id: string;
  freebrainer_email: string;
  freebrainer_name: string | null;
  brainlover_email: string | null;
  brainlover_name: string | null;
  session_start: string;
  session_end: string | null;
  status: "upcoming" | "completed" | "cancelled" | "unmatched";
  join_url: string | null;
  calendly_event_id: string | null;
  created_at: string;
}

export function useVirtualSessions(freebrainerEmail: string | null | undefined) {
  const [sessions, setSessions] = useState<VirtualSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    if (!freebrainerEmail) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: dbError } = await safeSupabaseQuery<VirtualSession[]>(() =>
      (supabase.from("virtual_sessions") as any)
        .select("*")
        .eq("freebrainer_email", freebrainerEmail)
        .order("session_start", { ascending: true })
    );

    console.log("[FB-DEBUG] useVirtualSessions: querying for email:", freebrainerEmail);

    if (dbError) {
      console.warn("[FB-DEBUG] useVirtualSessions: query error", dbError);
      setError(dbError.message);
    } else if (data) {
      setSessions(data);
      console.log("[FB-DEBUG] useVirtualSessions: fetched", data.length, "sessions for", freebrainerEmail, data);
    } else {
      console.log("[FB-DEBUG] useVirtualSessions: no data returned (null)");
    }

    setLoading(false);
  }, [freebrainerEmail]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return { sessions, loading, error, refetch: fetchSessions };
}
