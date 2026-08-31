/**
 * BrainLoverJointCheckInCard — "Do This Video Together Right Now"
 *
 * Lets the BrainLover pick a movement video and check-in WITH their
 * FreeBrainer — creating a check-in record on the FreeBrainer's behalf.
 *
 * Multi-step flow (reuses existing check-in components):
 *  1. Time slider + video preview (CheckInTimeStep) — default view
 *  2. Video playback (CheckInVideoStep)
 *  3. Submit (joint check-in insert)
 *
 * When the FreeBrainer already moved today, shows a green banner but
 * still allows "Let's Move Again!" — the BrainLover can earn extra points.
 *
 * Reuses: fetchPlaylistVideos, CheckInTimeStep, CheckInVideoStep,
 * getRandomPlaylistVideo, daily_checkins table. No redundant code.
 */
import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, CheckCircle2, Loader2 } from "lucide-react";
import { fetchPlaylistVideos, getRandomPlaylistVideo, YouTubeVideo } from "@/lib/youtube";
import { CheckInTimeStep } from "@/features/checkin/CheckInTimeStep";
import { CheckInVideoStep } from "@/features/checkin/CheckInVideoStep";
import { ActivityLogInput } from "@/features/checkin/ActivityLogInput";
import { supabase } from "@/lib/supabase";
import { isDevBypassUser } from "@/lib/devBypass";
import { addFreeBrainPoints } from "@/lib/scoreManager";
import { postToWall } from "@/lib/postToWall";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface BrainLoverJointCheckInCardProps {
  patientId: string;
  patientName: string;
  caregiverId: string;
  /** Called after a successful joint check-in so parent can refresh state */
  onCheckedIn?: () => void;
}

type JointStep = "time" | "video" | "done";

export function BrainLoverJointCheckInCard({
  patientId,
  patientName,
  caregiverId,
  onCheckedIn,
}: BrainLoverJointCheckInCardProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [step, setStep] = useState<JointStep>("time");
  const [selectedMinutes, setSelectedMinutes] = useState<number>(15);
  const [activeVideo, setActiveVideo] = useState<YouTubeVideo | null>(null);

  const isDevBypass = isDevBypassUser(patientId) || isDevBypassUser(caregiverId);

  useEffect(() => {
    loadVideos();
    checkIfAlreadyCheckedIn();
  }, []);

  const loadVideos = async () => {
    setLoading(true);
    const fetched = await fetchPlaylistVideos();
    const shuffled = [...fetched].sort(() => 0.5 - Math.random());
    setVideos(shuffled);
    // Auto-select first video so the time step has something to show
    if (shuffled[0]) setActiveVideo(shuffled[0]);
    setLoading(false);
  };

  const checkIfAlreadyCheckedIn = async () => {
    const todayStr = format(new Date(), "yyyy-MM-dd");

    if (isDevBypass) {
      const mockKey = `fb_mock_checkin_${patientId}_${todayStr}`;
      setHasCheckedIn(!!localStorage.getItem(mockKey));
      return;
    }

    try {
      const { data } = await supabase
        .from("daily_checkins")
        .select("id")
        .eq("user_id", patientId)
        .eq("checkin_date", todayStr)
        .maybeSingle();
      setHasCheckedIn(!!data);
    } catch {
      setHasCheckedIn(false);
    }
  };

  // ── Shuffle helper (used by "Go Back" in time step) ──
  const handleShuffle = () => {
    if (videos.length <= 1) return;
    const shuffled = [...videos].sort(() => 0.5 - Math.random());
    setVideos(shuffled);
    if (shuffled[0]) setActiveVideo(shuffled[0]);
  };

  // ── Video swap (for CheckInTimeStep / CheckInVideoStep) ──
  const handleSwapVideo = useCallback(
    async (maxDurationSeconds?: number) => {
      const effectiveMax = maxDurationSeconds ?? (selectedMinutes ? selectedMinutes * 60 : undefined);
      try {
        const excludeId = activeVideo?.id;
        const nextVid = await getRandomPlaylistVideo(excludeId, undefined, effectiveMax);
        if (nextVid) setActiveVideo(nextVid);
      } catch {
        // keep current video on failure
      }
    },
    [activeVideo, selectedMinutes]
  );

  // ── Time step → video step ──
  const handleSelectTime = (minutes: number) => {
    setSelectedMinutes(minutes);
    // If the active video is longer than selected time, try to swap
    if (activeVideo?.durationSeconds && activeVideo.durationSeconds > minutes * 60) {
      handleSwapVideo(minutes * 60);
    }
    setStep("video");
  };

  // ── Submit the joint check-in ──
  const handleJointCheckIn = async () => {
    if (!activeVideo) return;
    setSubmitting(true);
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const earned = 10 + Math.floor(Math.random() * 96) + 5;

    try {
      if (isDevBypass) {
        localStorage.setItem(
          `fb_mock_checkin_${patientId}_${todayStr}`,
          JSON.stringify({
            checkin_status: "moved",
            moved: true,
            points_earned: earned,
            duration_minutes: selectedMinutes,
            movement_type: "Joint with BrainLover",
            video_title: activeVideo.title,
            joint_checkin: true,
          })
        );
      } else {
        const { data: existing } = await (supabase
          .from("daily_checkins") as any)
          .select("id")
          .eq("user_id", patientId)
          .eq("checkin_date", todayStr)
          .maybeSingle();

        const checkinData: any = {
          moved: true,
          checkin_status: "moved",
          points_earned: earned,
          duration_minutes: selectedMinutes,
          movement_type: "Joint with BrainLover",
          notes: `Joint movement session with BrainLover: "${activeVideo.title}"`,
        };

        if (existing) {
          await (supabase.from("daily_checkins") as any)
            .update(checkinData)
            .eq("id", existing.id);
        } else {
          await (supabase.from("daily_checkins") as any)
            .insert({
              user_id: patientId,
              checkin_date: todayStr,
              ...checkinData,
            });
        }
      }

      // ── Increment the FreeBrainer's total_score ──
      if (earned > 0) {
        await addFreeBrainPoints(patientId, earned);

        // ── Post joint check-in activity to the Wall ──
        postToWall({
          userId: patientId,
          postedById: caregiverId,
          authorName: patientName,
          type: "joint_checkin",
          content: `🤝 ${patientName} moved together with their BrainLover! "${activeVideo.title}" +${earned} pts`,
        }).catch((e) => console.warn("[FB-DEBUG] postToWall joint check-in failed:", e));
      }

      setHasCheckedIn(true);
      setStep("done");
      onCheckedIn?.();
      // Notify the Updates page to refetch its timeline
      window.dispatchEvent(new Event("fb-activity-logged"));
      // Write to activity_log so it appears in the timeline
      try {
        const { safeSupabaseQuery } = await import("@/lib/supabase");
        const { error: logErr } = await safeSupabaseQuery(() =>
          (supabase.from("activity_log") as any).insert({
            freebrainer_id: patientId,
            brainlover_id: caregiverId,
            content: `Joint movement: "${activeVideo.title}"`,
          })
        );
        if (logErr) {
          // localStorage fallback
          const key = `fb_activity_log_${patientId}`;
          const existing = localStorage.getItem(key);
          const log = existing ? JSON.parse(existing) : [];
          log.unshift({
            id: `fallback_act_${Date.now()}`,
            brainlover_id: caregiverId,
            content: `Joint movement: "${activeVideo.title}"`,
            created_at: new Date().toISOString(),
          });
          localStorage.setItem(key, JSON.stringify(log.slice(0, 20)));
        }
      } catch (e) {
        console.warn("[FB-DEBUG] Joint check-in activity_log write failed:", e);
      }
      toast({
        title: t("loveTheirBrain.jointCheckInTitle", "Movement Logged Together! 🎉"),
        description: t("loveTheirBrain.jointCheckInDesc", "{{name}} earned {{points}} points from your joint movement session!", { name: patientName, points: earned }),
      });
    } catch (e: any) {
      toast({
        title: t("loveTheirBrain.jointCheckInError", "Could not log movement"),
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const firstName = patientName.split(" ")[0];

  // ── Done state ──
  if (step === "done") {
    return (
      <Card className="border-2 border-primary/40 bg-gradient-to-br from-primary/5 to-transparent shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            {t("loveTheirBrain.keepMovingTitle", "Keep Moving")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 border-2 border-emerald-500/30">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-bold text-foreground">
                {t("loveTheirBrain.jointDoneTitle", "You moved together! 🎉")}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("loveTheirBrain.jointDoneDesc", "{{name}} earned points from your joint session. Great work!", { name: firstName })}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setStep("time");
                setActiveVideo(videos[0] || null);
              }}
              className="gap-2 text-sm font-semibold"
            >
              {t("loveTheirBrain.moveAgain", "Let's Move Again!")}
            </Button>

            {/* ── " - or - " separator ── */}
            <div className="flex items-center gap-3 w-full py-1">
              <div className="h-px bg-border flex-1" />
              <span className="text-xs text-muted-foreground font-medium">— or —</span>
              <div className="h-px bg-border flex-1" />
            </div>

            {/* ── Inline activity log ── */}
            <div className="w-full text-left">
              <p className="text-xs text-muted-foreground mb-1.5 font-medium">
                {t("activityLog.inlineLabel", "Log an activity instead")}
              </p>
              <ActivityLogInput
                patientId={patientId}
                patientName={patientName}
                brainloverId={caregiverId}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Time step (reuse CheckInTimeStep) — this is now the default view ──
  if (step === "time" && activeVideo) {
    const alreadyMovedBanner = hasCheckedIn ? (
      <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-3 py-2">
        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-emerald-600">
            {t("loveTheirBrain.alreadyMoved", "{{name}} already moved today! 🎉", { name: firstName })}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("loveTheirBrain.moveAgainPrompt", "Want to move together again? Every bit counts!")}
          </p>
        </div>
      </div>
    ) : null;

    return (
      <Card className="border-2 border-primary/40 bg-gradient-to-br from-primary/5 to-transparent shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            {hasCheckedIn
              ? t("loveTheirBrain.keepMovingTitle", "Keep Moving")
              : t("loveTheirBrain.jointCheckInCardTitle", "Do This Video Together Right Now")}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {t("loveTheirBrain.jointCheckInCardDesc", "Pick a video, move alongside {{name}}, and log their check-in — all in one tap.", { name: firstName })}
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              {t("loveTheirBrain.loadingVideos", "Loading movement videos...")}
            </div>
          ) : (
            <CheckInTimeStep
              suggestedVideo={activeVideo}
              onSwapVideo={handleSwapVideo}
              onSelectOwn={() => handleJointCheckIn()}
              onSelectTime={handleSelectTime}
              onBack={handleShuffle}
              primaryLabel={
                hasCheckedIn
                  ? t("loveTheirBrain.moveAgain", "Let's Move Again!")
                  : t("loveTheirBrain.letsMove", "Let's Move")
              }
              hideSecondary
              banner={alreadyMovedBanner}
            />
          )}
        </CardContent>
      </Card>
    );
  }

  // ── Video playback step (reuse CheckInVideoStep) ──
  if (step === "video" && activeVideo) {
    return (
      <Card className="border-2 border-primary/40 bg-gradient-to-br from-primary/5 to-transparent shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            {hasCheckedIn ? t("loveTheirBrain.keepMovingTitle", "Keep Moving") : t("loveTheirBrain.jointCheckInCardTitle", "Do This Video Together Right Now")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CheckInVideoStep
            suggestedVideo={activeVideo}
            onSwapVideo={handleSwapVideo}
            onFinish={handleJointCheckIn}
            onAbort={() => {
              setStep("time");
              setActiveVideo(videos[0] || null);
            }}
            onBackToSwap={() => setStep("time")}
            onExitImmersive={() => {}}
          />
          {submitting && (
            <div className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("loveTheirBrain.loggingJoint", "Logging joint movement...")}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // ── Fallback: no video loaded yet ──
  return (
    <Card className="border-2 border-primary/40 bg-gradient-to-br from-primary/5 to-transparent shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
            {hasCheckedIn ? t("loveTheirBrain.keepMovingTitle", "Keep Moving") : t("loveTheirBrain.jointCheckInCardTitle", "Do This Video Together Right Now")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="py-12 text-center text-sm text-muted-foreground">
          {loading ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              {t("loveTheirBrain.loadingVideos", "Loading movement videos...")}
            </>
          ) : (
            t("loveTheirBrain.noVideos", "No videos available right now.")
          )}
        </div>
      </CardContent>
    </Card>
  );
}
