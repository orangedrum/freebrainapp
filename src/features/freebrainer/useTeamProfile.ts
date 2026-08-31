/**
 * useTeamProfile — fetches a team profile for the given user.
 *
 * When `overrideUserId` is provided (e.g. a BrainLover acting on behalf of
 * a FreeBrainer), it looks up that user's team instead of the logged-in
 * user's team.
 *
 * Data tier: Tier 2 (social) — team name, slogan, image, and code are
 * non-sensitive social data stored in Supabase.
 *
 * Returns:
 *  - team: the team object (id, name, slogan, image_url, code) or null
 *  - loading: whether data is still fetching
 *  - refresh: re-fetch trigger
 */
import { useState, useEffect, useCallback } from "react";
import { supabase, safeSupabaseQuery } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export interface TeamProfile {
  id: string;
  name: string;
  slogan?: string | null;
  image_url?: string | null;
  code?: string | null;
}

export function useTeamProfile(overrideUserId?: string | null) {
  const { user } = useAuth();
  const [team, setTeam] = useState<TeamProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    const lookupId = overrideUserId || user?.id;
    if (!lookupId) return;
    let cancelled = false;

    const fetchTeam = async () => {
      setLoading(true);

      try {
        // 1. Get user's team_id from team_members
        const { data: tm } = await safeSupabaseQuery<any>(() =>
          (supabase.from("team_members") as any)
            .select("team_id")
            .eq("user_id", lookupId)
            .maybeSingle()
        );

        if (!tm) {
          if (!cancelled) {
            setTeam(null);
            setLoading(false);
          }
          return;
        }

        // 2. Fetch the team profile
        const { data: teamData } = await safeSupabaseQuery<any>(() =>
          (supabase.from("teams") as any)
            .select("id, name, slogan, image_url, code")
            .eq("id", tm.team_id)
            .maybeSingle()
        );

        if (!cancelled) {
          setTeam(teamData || null);
        }
      } catch (e) {
        console.warn("[FB-DEBUG] useTeamProfile error:", e);
        if (!cancelled) setTeam(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchTeam();
    return () => { cancelled = true; };
  }, [user, overrideUserId, refreshKey]);

  return { team, loading, refresh };
}
