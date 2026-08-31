/**
 * useOverviewData — fetches the FreeBrainer's team ID and today's check-in status.
 *
 * Data tier: Tier 2 (social) — team membership and check-in completion are
 * non-sensitive social data stored in Supabase.
 *
 * Dev-bypass: When admin is role-switching, user.id is 'dev-user-id' (not a
 * valid UUID). Skip ALL Supabase calls and read from localStorage instead.
 *
 * Returns:
 *  - userTeamId: the user's team ID (or null)
 *  - hasCheckedInToday: whether the user has checked in today
 *  - loading: whether data is still fetching
 */
import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { safeSupabaseQuery } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { getDevCheckInToday } from "@/lib/devBypass";

export function useOverviewData() {
  const { user, isTestingMode } = useAuth();
  const [userTeamId, setUserTeamId] = useState<string | null>(null);
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const fetchOverviewData = async () => {
      setLoading(true);

      // ── Admin testing mode: skip check-in status query ──
      // isTestingMode covers the case where an admin with a real session
      // role-switches to freebrainer — we don't want to find a real check-in
      // and loop the modal open/close cycle forever.
      if (isTestingMode) {
        if (!cancelled) {
          setUserTeamId(null);
          setHasCheckedInToday(getDevCheckInToday());
          setLoading(false);
        }
        return;
      }

      // 1. Fetch user team
      try {
        const { data: tm } = await safeSupabaseQuery<any>(() =>
          (supabase.from("team_members") as any)
            .select("team_id")
            .eq("user_id", user.id)
            .maybeSingle()
        );
        if (!cancelled && tm) setUserTeamId(tm.team_id);
      } catch (e) {}

      // 2. Fetch today's checkin status
      //    CRITICAL: Use LOCAL date (not UTC) to match the date that
      //    useCheckInData.submitCheckIn saves under. A UTC/local mismatch
      //    causes the modal to re-open after checking in.
      try {
        const todayStr = format(new Date(), "yyyy-MM-dd");
        const { data: checkin } = await safeSupabaseQuery<any>(() =>
          (supabase.from("daily_checkins") as any)
            .select("id")
            .eq("user_id", user.id)
            .eq("checkin_date", todayStr)
            .maybeSingle()
        );
        if (!cancelled && checkin) setHasCheckedInToday(true);
        else if (!cancelled) setHasCheckedInToday(false);
      } catch (e) {}

      if (!cancelled) setLoading(false);
    };

    fetchOverviewData();
    return () => { cancelled = true; };
  }, [user, refreshKey, isTestingMode]);

  // Expose refetch so the parent can refresh after a check-in completes
  const refetch = useCallback(() => setRefreshKey((k) => k + 1), []);

  return { userTeamId, hasCheckedInToday, loading, refetch };
}
