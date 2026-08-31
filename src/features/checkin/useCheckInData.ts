import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, safeSupabaseQuery } from "@/lib/supabase";
import { getRandomPlaylistVideo } from "@/lib/youtube";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import {
  getWellnessParams,
  getSymptomEntryForDate,
  saveSymptomEntry,
  getDeviceMetrics,
  isDeviceConnected,
  validateSymptomStorage,
  type DeviceMetric,
} from "@/lib/symptomStorage";
import { markDevCheckIn, getDevCheckInToday, clearDevCheckIn, isDevBypassUser } from "@/lib/devBypass";
import { addFreeBrainPoints } from "@/lib/scoreManager";
import { postToWall } from "@/lib/postToWall";

export type CheckinStatus = "moved" | "rest_day" | "flare_up" | null;

export interface CheckInResult {
  status: CheckinStatus;
  pointsEarned: number;
  notes: string;
  symptomLevels: Record<string, number>;
}

export interface CheckInState {
  isLoading: boolean;
  isFetching: boolean;
  checkinStatus: CheckinStatus;
  videoChoice: "followed" | "own" | "both" | null;
  suggestedVideo: any;
  notes: string;
  hasCheckedInToday: boolean;
  streak: number;
  stats: { moved: number; rest: number; flare: number };
  pastJournals: { date: string; note: string }[];
  userSymptoms: string[];
  symptomLevels: Record<string, number>;
  userTeam: any;
  smartwatchDetected: boolean;
  pointsEarned: number;
  mysteryBoxState: "hidden" | "spinning" | "revealed";
  today: string;
}

// ── Default wellness parameters (Tier 1: localStorage only) ──
// These are general wellness goals, NOT clinical symptoms.
// Used as fallback when no params are saved in localStorage.
const DEFAULT_WELLNESS_PARAMS = [
  "general wellness",
  "movement ease",
  "flexibility",
  "energy level",
  "balance",
  "focus & clarity",
];

export function useCheckInData(opts?: { overrideUserId?: string; overrideEmail?: string }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user, isTestingMode } = useAuth();

  // ── Override support: BrainLover checking in on behalf of a FreeBrainer ──
  // When overrideUserId is provided, all check-in reads/writes target that
  // user instead of the logged-in BrainLover. The BrainLover's own auth
  // session is still used for RLS — the override only changes the user_id
  // written to daily_checkins and the profile score.
  const overrideUserId = opts?.overrideUserId;
  const overrideEmail = opts?.overrideEmail;
  const effectiveUserId = overrideUserId || user?.id;
  const effectiveEmail = overrideEmail || user?.email;

  // ── Reactive "today" — recomputed on every render ──
  // This ensures that if the app stays open past midnight,
  // the date string updates and triggers a re-fetch.
  const [today, setToday] = useState(() => format(new Date(), "yyyy-MM-dd"));

  // ── Midnight crossover detector ──
  // Checks every 60 seconds if the date has changed.
  // Also listens for `visibilitychange` (PWA returning to foreground).
  useEffect(() => {
    const checkDate = () => {
      const newToday = format(new Date(), "yyyy-MM-dd");
      setToday((prev) => (prev !== newToday ? newToday : prev));
    };
    // Poll every 60s (lightweight)
    const interval = setInterval(checkDate, 60_000);
    // Re-check when tab becomes visible again (PWA foreground)
    document.addEventListener("visibilitychange", checkDate);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", checkDate);
    };
  }, []);

  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  const [checkinStatus, setCheckinStatus] = useState<CheckinStatus>(null);
  const [videoChoice, setVideoChoice] = useState<"followed" | "own" | "both" | null>(null);
  const [suggestedVideo, setSuggestedVideo] = useState<any>(null);
  // ── Selected movement time (minutes) — persists across check-in steps ──
  // Stored here so the video step can pass it as maxDurationSeconds when
  // the user swaps videos, ensuring replacements stay within the time budget.
  const [selectedMinutes, setSelectedMinutes] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);

  const [streak, setStreak] = useState(0);
  const [stats, setStats] = useState({ moved: 0, rest: 0, flare: 0 });
  const [pastJournals, setPastJournals] = useState<{ date: string; note: string }[]>([]);

  const [userSymptoms, setUserSymptoms] = useState<string[]>([]);
  const [symptomLevels, setSymptomLevels] = useState<Record<string, number>>({});
  const [userTeam, setUserTeam] = useState<any>(null);

  const [mysteryBoxState, setMysteryBoxState] = useState<"hidden" | "spinning" | "revealed">("hidden");
  const [pointsEarned, setPointsEarned] = useState(0);
  const [smartwatchDetected, setSmartwatchDetected] = useState(false);
  const [deviceMetrics, setDeviceMetrics] = useState<DeviceMetric[]>([]);

  // ── Admin testing mode guard ──
  // When an admin with a real session role-switches, we must NOT query
  // Supabase for check-in status (it would find no check-in and loop the
  // modal open/close cycle forever). The mock client handles dev-bypass.
  // Dev-bypass applies when the effective user ID is a dev-patient or dev-user-id
  const isTestingBypass = isTestingMode || isDevBypassUser(effectiveUserId);

  // ── Stable refs for values used inside fetchTodayCheckIn ──
  // These let us read the latest state WITHOUT adding them to the
  // callback's dependency array (which would recreate the callback
  // on every state change and re-trigger the fetch effect).
  const hasCheckedInTodayRef = useRef(hasCheckedInToday);
  hasCheckedInTodayRef.current = hasCheckedInToday;
  const suggestedVideoRef = useRef(suggestedVideo);
  suggestedVideoRef.current = suggestedVideo;

  const fetchTodayCheckIn = useCallback(async () => {
    if (!effectiveUserId) return;
    // Admin testing mode: skip Supabase, simulate locally
    if (isTestingBypass) {
      // When overriding (BrainLover checking in a dev-patient), read the
      // patient-specific mock key, not the admin's own key.
      const checkedInToday = overrideUserId
        ? !!localStorage.getItem(`fb_mock_checkin_${overrideUserId}_${today}`)
        : getDevCheckInToday();
      setUserTeam(null);
      setHasCheckedInToday(checkedInToday);
      setCheckinStatus(checkedInToday ? "moved" : null);
      setNotes("");
      setStreak(checkedInToday ? 1 : 0);
      setStats({ moved: checkedInToday ? 1 : 0, rest: 0, flare: 0 });
      setPastJournals([]);
      if (checkedInToday) {
        setMysteryBoxState("revealed");
        setPointsEarned(50);
      } else {
        setMysteryBoxState("hidden");
        setPointsEarned(0);
      }
      const params = getWellnessParams(effectiveUserId);
      const effectiveParams = params.length > 0 ? params : DEFAULT_WELLNESS_PARAMS;
      setUserSymptoms(effectiveParams);
      const todayEntry = getSymptomEntryForDate(effectiveUserId, today);
      if (todayEntry) {
        setSymptomLevels(todayEntry.symptomLevels);
      } else {
        const initial: Record<string, number> = {};
        effectiveParams.forEach((s) => (initial[s] = 0));
        setSymptomLevels(initial);
      }
      setIsFetching(false);
      return;
    }
    try {
      const { data: tm } = await safeSupabaseQuery<any>(() =>
        (supabase.from("team_members") as any)
          .select("team_id, teams(*)")
          .eq("user_id", user.id)
          .maybeSingle()
      );
      if (tm && tm.teams) setUserTeam(tm.teams);
      else setUserTeam(null);
    } catch {
      setUserTeam(null);
    }

    // ── Tier 1: Read symptoms from localStorage (HIPAA-compliant) ──
    // Raw symptom data NEVER touches Supabase. Wellness params and
    // symptom levels are stored device-only via symptomStorage.ts.
    validateSymptomStorage(effectiveUserId);

    // (DEFAULT_WELLNESS_PARAMS is now module-scoped — see above)

    // Read wellness params from localStorage (Tier 1)
    const params = getWellnessParams(effectiveUserId);
    const effectiveParams = params.length > 0 ? params : DEFAULT_WELLNESS_PARAMS;
    setUserSymptoms(effectiveParams);

    // Read today's symptom entry from localStorage (if exists)
    const todayEntry = getSymptomEntryForDate(effectiveUserId, today);
    if (todayEntry) {
      setSymptomLevels(todayEntry.symptomLevels);
    } else {
      // Initialize all params to 0
      const initial: Record<string, number> = {};
      effectiveParams.forEach((s) => (initial[s] = 0));
      setSymptomLevels(initial);
    }

    // Read device metrics from localStorage (Tier 1)
    const metrics = getDeviceMetrics(effectiveUserId);
    setDeviceMetrics(metrics);
    if (isDeviceConnected(effectiveUserId)) {
      setSmartwatchDetected(true);
    }

    // Fetch all check-ins
    const { data: allCheckins } = await (supabase.from("daily_checkins") as any)
      .select("*")
      .eq("user_id", effectiveUserId)
      .order("checkin_date", { ascending: false });

    if (allCheckins?.length > 0) {
      // Streak calculation
      let currentStreak = 0;
      let d = new Date();
      for (const checkin of allCheckins) {
        const checkinDate = new Date(checkin.checkin_date);
        const diffDays = Math.floor((d.getTime() - checkinDate.getTime()) / (1000 * 3600 * 24));
        if (diffDays <= 1) {
          currentStreak++;
          d = checkinDate;
        } else break;
      }
      setStreak(currentStreak);

      // Stats & journals
      const newStats = { moved: 0, rest: 0, flare: 0 };
      const journals: { date: string; note: string }[] = [];
      allCheckins.forEach((c: any) => {
        if (c.checkin_status === "moved" || c.moved) newStats.moved++;
        else if (c.checkin_status === "rest_day") newStats.rest++;
        else if (c.checkin_status === "flare_up") newStats.flare++;
        if (c.notes) journals.push({ date: c.checkin_date, note: c.notes });
      });
      setStats(newStats);
      setPastJournals(journals.slice(0, 5));

      // Today's check-in — match by checkin_date ONLY (not created_at).
      // The old code used created_at as a fallback, which caused yesterday's
      // late-night check-in to appear as "today" the next morning.
      const todayStr = format(new Date(), "yyyy-MM-dd");
      const todayCheckin = allCheckins.find((c: any) => c.checkin_date === todayStr);

      if (todayCheckin) {
        setHasCheckedInToday(true);
        setCheckinStatus(todayCheckin.checkin_status || (todayCheckin.moved ? "moved" : null));
        setNotes(todayCheckin.notes || "");
        if (todayCheckin.points_earned) {
          setPointsEarned(todayCheckin.points_earned);
          setMysteryBoxState("revealed");
        }
      } else {
        setHasCheckedInToday(false);
        setCheckinStatus(null);
        setNotes("");
        setMysteryBoxState("hidden");
        setPointsEarned(0);
      }
    } else {
      setHasCheckedInToday(false);
      setCheckinStatus(null);
      setNotes("");
    }

    // Only fetch a video if the user hasn't checked in yet AND we don't
    // already have one. NOTE: Video fetching is now handled by CheckInFlow's
    // own effect, NOT here — doing it here caused re-render loops because
    // setSuggestedVideo → recreated fetchTodayCheckIn → re-ran the effect.
    // We intentionally do NOT call getRandomPlaylistVideo here.

    setIsFetching(false);
  }, [effectiveUserId, today, isTestingMode, isTestingBypass]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!effectiveUserId) return;

    // ── Smartwatch detection placeholder ──
    // Always returns false for now. Future: integrate Web Device API,
    // Apple HealthKit Web, or Google Fit API to detect real device activity.
    // This replaces the old Math.random() > 0.5 random detection.
    const detectSmartwatchActivity = (): boolean => {
      // Placeholder for future device API integration
      return false;
    };
    setSmartwatchDetected(detectSmartwatchActivity());

    const handleTeamUpdate = (e: any) => {
      if (e.detail) setUserTeam(e.detail);
    };
    window.addEventListener("team_updated", handleTeamUpdate);

    fetchTodayCheckIn();

    return () => window.removeEventListener("team_updated", handleTeamUpdate);
  }, [effectiveUserId, today, isTestingMode, fetchTodayCheckIn]); // eslint-disable-line react-hooks/exhaustive-deps

  // Submit check-in to database
  const submitCheckIn = useCallback(
    async (hasMultiplier = false): Promise<CheckInResult | null> => {
      if (!effectiveUserId || !checkinStatus) return null;

      setIsLoading(true);
      try {
        let earned = 0;
        if (checkinStatus === "moved" || checkinStatus === "rest_day") {
          earned = 10 + Math.floor(Math.random() * 96) + 5;
          if (hasMultiplier) earned *= 2;
        }

        // ── Tier 1: Save symptom levels to localStorage (HIPAA) ──
        if (effectiveUserId && Object.keys(symptomLevels).length > 0) {
          saveSymptomEntry(effectiveUserId, {
            date: today,
            symptomLevels,
            notes: notes || undefined,
            createdAt: new Date().toISOString(),
          });
        }

        // ── Testing mode (admin with real session): skip Supabase, simulate locally ──
        if (isTestingBypass) {
          console.log("[FB-DEBUG] Testing mode — skipping Supabase check-in insert (mock user)");
          // ── Write to the correct localStorage key ──
          // For override (BrainLover proxy), write to the patient-specific key
          // so useBrainLoverData.loadPatientCheckIn picks it up.
          // For self (admin as FreeBrainer), use the admin's own key.
          const todayLocal = format(new Date(), "yyyy-MM-dd");
          if (overrideUserId) {
            localStorage.setItem(
              `fb_mock_checkin_${overrideUserId}_${todayLocal}`,
              JSON.stringify({
                moved: true,
                checkin_status: checkinStatus,
                duration_minutes: selectedMinutes ?? 0,
                movement_type: checkinStatus === "moved"
                  ? (videoChoice === "followed" ? "Guided Video" : videoChoice === "own" ? "Own Movement" : "Mixed")
                  : "Rest Day",
                checkin_date: todayLocal,
                notes: notes || "",
                points_earned: earned,
              })
            );
          } else {
            markDevCheckIn(); // ← persist to admin's own localStorage key
          }
          setHasCheckedInToday(true);
          if (earned > 0) {
            setPointsEarned(earned);
            setMysteryBoxState("spinning");
            setTimeout(() => setMysteryBoxState("revealed"), 2000);
          } else {
            toast({ title: t("checkin.savedTitle", "Check-in saved!"), description: t("checkin.savedDesc", "Recorded successfully.") });
            setMysteryBoxState("revealed");
          }
          return { status: checkinStatus, pointsEarned: earned, notes, symptomLevels };
        }

        // ── Tier 2: Only non-sensitive data goes to Supabase ──
        const checkinData: any = {
          moved: checkinStatus === "moved",
          checkin_status: checkinStatus,
          notes,
          points_earned: earned,
          duration_minutes: checkinStatus === "moved" ? (selectedMinutes ?? 0) : 0,
          movement_type: checkinStatus === "moved"
            ? (videoChoice === "followed" ? "Guided Video" : videoChoice === "own" ? "Own Movement" : "Mixed")
            : checkinStatus === "rest_day" ? "Rest Day" : "Flare-Up",
        };

        if (hasCheckedInToday) {
          const { error } = await (supabase.from("daily_checkins") as any)
            .update(checkinData)
            .eq("user_id", effectiveUserId)
            .eq("checkin_date", today);
          if (error) throw error;
        } else {
          const { error } = await (supabase.from("daily_checkins") as any)
            .insert({ user_id: effectiveUserId, checkin_date: today, ...checkinData });
          if (error) throw error;
          setHasCheckedInToday(true);
        }

        // ── Also write the notes/activity to activity_log ──
        // This ensures the check-in activity shows up in the timeline,
        // not just in the daily_checkins notes field.
        if (notes && notes.trim()) {
          try {
            const { error: logErr } = await safeSupabaseQuery(() =>
              (supabase.from("activity_log") as any).insert({
                freebrainer_id: effectiveUserId,
                brainlover_id: user?.id || effectiveUserId,
                content: notes.trim(),
              })
            );
            if (logErr) {
              console.warn("[FB-DEBUG] submitCheckIn: activity_log insert failed (non-fatal):", logErr);
            }
          } catch (e) {
            console.warn("[FB-DEBUG] submitCheckIn: activity_log insert error (non-fatal):", e);
          }
        }

        // ── Increment score + post to Wall ──
        // Points earned from the check-in are added to the running total
        // so the leaderboard reflects movement activity.
        // For managed sub-accounts (no profiles row), addFreeBrainPoints
        // silently affects 0 rows — that's OK, the check-in itself still
        // succeeds and the score is tracked in daily_checkins.points_earned.
        if (earned > 0 && effectiveUserId) {
          addFreeBrainPoints(effectiveUserId, earned).catch((e) =>
            console.warn("[FB-DEBUG] Score increment after check-in failed:", e)
          );

          // ── Post check-in activity to the Wall ──
          const statusEmoji = checkinStatus === "moved" ? "✅" : checkinStatus === "rest_day" ? "😌" : "💪";
          const statusLabel = checkinStatus === "moved"
            ? (overrideUserId ? "I Moved Today" : "I Moved Today")
            : checkinStatus === "rest_day"
              ? (overrideUserId ? "Rested Their Brain" : "Rested My Brain")
              : (overrideUserId ? "Tested Their Brain" : "Tested My Brain");
          const userName = effectiveEmail?.split("@")[0] || "FreeBrainer";
          postToWall({
            userId: effectiveUserId,
            postedById: user?.id || effectiveUserId,
            authorName: userName,
            type: "checkin",
            content: `${statusEmoji} ${userName} ${statusLabel.toLowerCase()} today! +${earned} pts`,
          }).catch((e) => console.warn("[FB-DEBUG] postToWall check-in failed:", e));

          setPointsEarned(earned);
          setMysteryBoxState("spinning");
          setTimeout(() => setMysteryBoxState("revealed"), 2000);
        } else {
          toast({ title: t("checkin.savedTitle", "Check-in saved!"), description: t("checkin.savedDesc", "Recorded successfully.") });
          setMysteryBoxState("revealed");
        }

        return { status: checkinStatus, pointsEarned: earned, notes, symptomLevels };
      } catch (error: any) {
        toast({ title: t("checkin.errorTitle", "Error saving check-in"), description: error.message, variant: "destructive" });
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [effectiveUserId, checkinStatus, notes, symptomLevels, hasCheckedInToday, today, t, toast, selectedMinutes, videoChoice, isTestingBypass, user]
  );

  // Reset today's check-in (admin only)
  const resetCheckIn = useCallback(async () => {
    if (!effectiveUserId) return;
    // Testing bypass: just reset local state + clear localStorage (no Supabase)
    if (isTestingBypass) {
      if (overrideUserId) {
        localStorage.removeItem(`fb_mock_checkin_${overrideUserId}_${today}`);
      } else {
        clearDevCheckIn();
      }
      setHasCheckedInToday(false);
      setCheckinStatus(null);
      setNotes("");
      setMysteryBoxState("hidden");
      setPointsEarned(0);
      toast({ title: t("checkin.resetTitle", "Check-in reset"), description: t("checkin.resetDesc", "You can now check in again.") });
      return;
    }
    setIsLoading(true);
    try {
      await (supabase.from("daily_checkins") as any).delete().eq("user_id", effectiveUserId).eq("checkin_date", today);
      setHasCheckedInToday(false);
      setCheckinStatus(null);
      setNotes("");
      setMysteryBoxState("hidden");
      setPointsEarned(0);
      toast({ title: t("checkin.resetTitle", "Check-in reset"), description: t("checkin.resetDesc", "You can now check in again.") });
    } catch (err: any) {
      toast({ title: t("checkin.resetError", "Error resetting"), description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [effectiveUserId, today, t, toast, isTestingBypass]);

  return {
    isLoading, setIsLoading,
    isFetching,
    checkinStatus, setCheckinStatus,
    videoChoice, setVideoChoice,
    suggestedVideo, setSuggestedVideo,
    selectedMinutes, setSelectedMinutes,
    notes, setNotes,
    hasCheckedInToday, setHasCheckedInToday,
    streak, stats, pastJournals,
    userSymptoms, symptomLevels, setSymptomLevels,
    userTeam, setUserTeam,
    smartwatchDetected, setSmartwatchDetected,
    deviceMetrics,
    pointsEarned, setPointsEarned,
    mysteryBoxState, setMysteryBoxState,
    today,
    submitCheckIn,
    resetCheckIn,
    refetch: fetchTodayCheckIn,
    // Expose overrideUserId so CheckInFlow can write activity_log to the
    // FreeBrainer's ID when a BrainLover checks in on their behalf.
    _overrideUserId: effectiveUserId,
  };
}
