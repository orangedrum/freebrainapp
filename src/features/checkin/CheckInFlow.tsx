import React, { useState, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { CheckInMovementChoice } from "./CheckInMovementChoice";
import { MysteryBoxReward } from "./MysteryBoxReward";
import { CheckInTimeStep } from "./CheckInTimeStep";
import { CheckInVideoStep } from "./CheckInVideoStep";
import { CheckInSymptomStep } from "./CheckInSymptomStep";
import { CheckInReviewStep } from "./CheckInReviewStep";
import { CheckInActivityLogStep } from "./CheckInActivityLogStep";
import { useCheckInData, type CheckInResult } from "./useCheckInData";
import { getRandomPlaylistVideo } from "@/lib/youtube";
import { useAuth } from "@/contexts/AuthContext";
import { setCheckInProgressGlobal } from "@/hooks/usePWAUpdate";

/**
 * Writes an activity log entry to the `activity_log` Supabase table.
 * Called from both the video-finish path and the manual activity log step.
 * Falls back to localStorage if the insert fails (RLS, dev-bypass, etc.).
 *
 * @param text       — the activity description (e.g. video title or user-typed text)
 * @param ci         — the check-in data instance (for overrideUserId)
 * @param user       — the logged-in user (for brainlover_id / author)
 */
async function logActivityToTable(
  text: string,
  ci: ReturnType<typeof useCheckInData>,
  user: any
) {
  if (!text.trim()) return;
  const freebrainerId = (ci as any)._overrideUserId || user?.id;
  if (!freebrainerId) return;

  try {
    const { supabase, safeSupabaseQuery } = await import("@/lib/supabase");
    const { error } = await safeSupabaseQuery(() =>
      (supabase.from("activity_log") as any).insert({
        freebrainer_id: freebrainerId,
        brainlover_id: user?.id || freebrainerId,
        content: text.trim(),
      })
    );
    if (error) {
      console.warn("[FB-DEBUG] logActivityToTable: insert failed, using localStorage fallback:", error);
      const key = `fb_activity_log_${freebrainerId}`;
      const existing = localStorage.getItem(key);
      const log = existing ? JSON.parse(existing) : [];
      log.unshift({
        id: `fallback_act_${Date.now()}`,
        brainlover_id: user?.id || freebrainerId,
        content: text.trim(),
        created_at: new Date().toISOString(),
      });
      localStorage.setItem(key, JSON.stringify(log.slice(0, 20)));
    }
  } catch (e) {
    console.warn("[FB-DEBUG] logActivityToTable error:", e);
  }
}

export type CheckInPerspective = "self" | "proxy";

export interface CheckInFlowProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: (result: any) => void;
  /** Required: the single data instance owned by the parent page */
  checkInData: any;
  /** Optional: multiplier bonus flag */
  hasMultiplier?: boolean;
  /** Allow opening even when already checked in today (Keep Moving card) */
  allowBonusSession?: boolean;
  /**
   * "self" = the FreeBrainer checking in for themselves (default).
   * "proxy" = a BrainLover checking in on behalf of their FreeBrainer.
   * Swaps pronouns: "my" → "their", "I" → "they", etc. via i18n keys.
   */
  perspective?: CheckInPerspective;
}

export const CheckInFlow: React.FC<CheckInFlowProps> = ({
  isOpen,
  onOpenChange,
  onComplete,
  checkInData,
  hasMultiplier = false,
  allowBonusSession = false,
  perspective = "self",
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const ci = checkInData;

  const [checkinStep, setCheckinStep] = useState(0);

  // When the sheet opens, jump to step 1 (movement choice).
  // When it closes, reset to step 0 so next open starts fresh.
  // Also flag the PWA update hook so it defers any pending reload.
  useEffect(() => {
    if (isOpen) {
      // If the user has ALREADY checked in today, force-close immediately
      // UNLESS this is a bonus session (Keep Moving card).
      // Only close when the mystery box is fully revealed — NOT during
      // the spinning animation (checkinStatus "moved" is set before spin).
      // IMPORTANT: Wait for isFetching to be false — otherwise the initial
      // render has hasCheckedInToday=false (default) and the modal would
      // open briefly, then close once data loads revealing a real check-in.
      // But more critically: if isFetching is true, we don't know the real
      // status yet, so we should NOT auto-close. Let the data load first.
      if (!allowBonusSession && !ci.isFetching && ci.hasCheckedInToday && ci.mysteryBoxState === "revealed") {
        onOpenChange(false);
        return;
      }
      // For bonus sessions, reset the mystery box so the flow starts fresh
      if (allowBonusSession) {
        ci.setMysteryBoxState("hidden");
        ci.setPointsEarned(0);
      }
      setCheckinStep(1);
    } else {
      setCheckinStep(0);
      setCheckInProgressGlobal(false);
    }
  }, [isOpen, ci.isFetching, ci.hasCheckedInToday, ci.mysteryBoxState]); // eslint-disable-line react-hooks/exhaustive-deps

  // Block PWA updates only during video playback (step 2) — the one step
  // where a reload would actually interrupt the user's activity.
  useEffect(() => {
    if (isOpen && checkinStep === 2) {
      setCheckInProgressGlobal(true);
    } else if (isOpen && checkinStep !== 2) {
      setCheckInProgressGlobal(false);
    }
  }, [isOpen, checkinStep]);

  const handleSwapVideo = useCallback(
    async (maxDurationSeconds?: number) => {
      // If no explicit duration passed, fall back to the user's selected time.
      // This ensures swaps from the video step still respect the time budget.
      const effectiveMax = maxDurationSeconds ?? (ci.selectedMinutes ? ci.selectedMinutes * 60 : undefined);
      try {
        const currentId = ci.suggestedVideo?.id;
        const nextVid = await getRandomPlaylistVideo(currentId, undefined, effectiveMax);
        ci.setSuggestedVideo(nextVid);
      } catch {
        // Fallback video so the flow never gets stuck
        ci.setSuggestedVideo({
          id: "TOA1ntG7DSc",
          title: "Daily Brain Movement Therapy",
          description: "Guided movement session from your playlist.",
          thumbnail: "",
          embedUrl: "https://www.youtube.com/embed/TOA1ntG7DSc?autoplay=1&rel=0",
          durationSeconds: 600,
          isVertical: false,
        });
      }
    },
    [ci]
  );

  // Safety net: when the flow opens and we're about to show the time step
  // or video step, ensure a video is loaded. If not, fetch one immediately.
  // Guard with a ref to prevent re-fetching when the effect re-runs due to
  // ci object identity changes (which happen on every state update).
  // Also skip if the user has already checked in — no need to fetch a video.
  // UNLESS this is a bonus session (Keep Moving card).
  const videoFetchRef = useRef(false);
  useEffect(() => {
    if (!isOpen) return;
    if (checkinStep === 0) return; // not started yet
    if (ci.hasCheckedInToday && !allowBonusSession) return; // already checked in, no video needed
    if (ci.suggestedVideo?.id) return; // already have a video
    if (videoFetchRef.current) return; // already fetching
    videoFetchRef.current = true;
    handleSwapVideo();
  }, [isOpen, checkinStep, ci.suggestedVideo?.id, ci.hasCheckedInToday, allowBonusSession]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const result = await ci.submitCheckIn(hasMultiplier);
    if (result && onComplete) onComplete(result);
  };

  const pfx = perspective === "proxy" ? "proxy." : "";
  const stepTitle = () => {
    if (checkinStep === 1) return t(`checkin.${pfx}stepFeelUpTo`, "What do you feel up to today?");
    if (checkinStep === 1.5) return t(`checkin.${pfx}stepTime`, "How much time do you have?");
    if (checkinStep === 2) return t(`checkin.${pfx}stepMovement`, "Free Your Brain");
    if (checkinStep === 2.5) return t(`checkin.${pfx}logActivityTitle`, "Log an Activity");
    if (checkinStep === 3) return t(`checkin.${pfx}stepTrackSymptoms`, "Track Your Symptoms");
    if (checkinStep === 4) return t(`checkin.${pfx}stepReviewNotes`, "Review & Notes");
    return "";
  };

  return (
      <Sheet
        open={isOpen}
        onOpenChange={(open) => {
          // Prevent accidental sheet dismissal during video playback step
          if (!open && checkinStep === 2) return;
          // Allow the user to dismiss the modal at any other step.
          // The parent (Overview) tracks a "dismissed this session" flag
          // to prevent the modal from auto-reopening after manual close.
          onOpenChange(open);
        }}
    >
      <SheetContent
        side="bottom"
        className="h-[95vh] sm:h-[90vh] overflow-y-auto rounded-t-2xl px-4 sm:px-6"
      >
        {ci.mysteryBoxState === "hidden" ? (
          <>
            <SheetHeader className="pb-6 pt-2">
              <SheetTitle className="text-2xl text-center">
                {stepTitle()}
              </SheetTitle>
              {checkinStep === 1 && (
                <SheetDescription className="text-center text-base mt-2">
                  {t(`checkin.${pfx}forgivingStreak`, "Every entry counts toward your health journey.")}
                </SheetDescription>
              )}
            </SheetHeader>

            <div className="pb-8">
              {/* Step 1: Movement choice */}
              {checkinStep === 1 && (
                <CheckInMovementChoice
                  checkinStep={1}
                  setCheckinStep={setCheckinStep}
                  setCheckinStatus={ci.setCheckinStatus}
                  suggestedVideo={ci.suggestedVideo}
                  onSwapVideo={handleSwapVideo}
                  setVideoChoice={ci.setVideoChoice}
                  perspective={perspective}
                />
              )}

              {/* Step 1.5: Time selection (only for "Free My Brain") */}
              {checkinStep === 1.5 && (
                <CheckInTimeStep
                  suggestedVideo={ci.suggestedVideo}
                  onSwapVideo={handleSwapVideo}
                  onSelectOwn={() => {
                    ci.setVideoChoice("own");
                    setCheckinStep(2.5);
                  }}
                  onSelectTime={(minutes) => {
                    ci.setVideoChoice("followed");
                    ci.setSelectedMinutes(minutes);
                    setCheckinStep(2);
                  }}
                  onBack={() => setCheckinStep(1)}
                />
              )}

              {/* Step 2: Video playback */}
              {checkinStep === 2 && (
                <CheckInVideoStep
                  suggestedVideo={ci.suggestedVideo}
                  onSwapVideo={handleSwapVideo}
                  onFinish={() => {
                    // Auto-log the video they did — write to activity_log + skip manual log step
                    const videoTitle = ci.suggestedVideo?.title || "Guided movement video";
                    ci.setNotes(videoTitle);
                    // Write to activity_log so it appears in the timeline
                    logActivityToTable(videoTitle, ci, user);
                    window.dispatchEvent(new CustomEvent("fb-activity-logged", { detail: { text: videoTitle } }));
                    setCheckinStep(3);
                  }}
                  onAbort={() => {
                    ci.setVideoChoice(null);
                    setCheckinStep(1);
                  }}
                  onBackToSwap={() => {
                    setCheckinStep(1.5);
                  }}
                  onExitImmersive={() => {
                    // Only close immersive overlay — do NOT change the check-in step.
                    // The user stays on the video step and can continue from there.
                  }}
                  perspective={perspective}
                />
              )}

              {/* Step 2.5: Log an Activity (only when user moved) */}
              {checkinStep === 2.5 && (
                <CheckInActivityLogStep
                  initialNotes={ci.notes}
                  onContinue={(activityText) => {
                    // Save activity text as notes so it appears in the review summary
                    ci.setNotes(activityText);
                    // Write to activity_log table so it shows in the timeline
                    logActivityToTable(activityText, ci, user);
                    // Dispatch event so timeline/log updates live
                    window.dispatchEvent(new CustomEvent("fb-activity-logged", { detail: { text: activityText } }));
                    setCheckinStep(3);
                  }}
                  onBack={() => setCheckinStep(ci.videoChoice === "own" ? 1.5 : 2)}
                  perspective={perspective}
                />
              )}

              {/* Step 3: Symptoms */}
              {checkinStep === 3 && (
                <CheckInSymptomStep
                  userSymptoms={ci.userSymptoms}
                  symptomLevels={ci.symptomLevels}
                  setSymptomLevels={ci.setSymptomLevels}
                  checkinStatus={ci.checkinStatus}
                  deviceTrackedSymptoms={ci.deviceMetrics || []}
                  onBack={() => setCheckinStep(ci.videoChoice === "own" ? 2.5 : ci.checkinStatus === "moved" ? 2 : 1)}
                  onContinue={() => setCheckinStep(4)}
                />
              )}

              {/* Step 4: Review & Notes */}
              {checkinStep === 4 && (
                <CheckInReviewStep
                  checkinStatus={ci.checkinStatus}
                  videoChoice={ci.videoChoice}
                  userSymptoms={ci.userSymptoms}
                  symptomLevels={ci.symptomLevels}
                  isLoading={ci.isLoading}
                  onBack={() => setCheckinStep(3)}
                  onSubmit={handleSubmit}
                  perspective={perspective}
                />
              )}
            </div>
          </>
        ) : (
          <MysteryBoxReward
            mysteryBoxState={ci.mysteryBoxState}
            pointsEarned={ci.pointsEarned}
            hasMultiplier={hasMultiplier}
            onClose={() => onOpenChange(false)}
            userEmail={user?.email}
            perspective={perspective}
          />
        )}
      </SheetContent>
    </Sheet>
  );
};
