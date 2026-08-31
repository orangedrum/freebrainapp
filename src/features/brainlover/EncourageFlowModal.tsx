/**
 * EncourageFlowModal — unified encouragement flow for BrainLovers.
 *
 * Triggered by "Remind to Move" or "Raise Standing" buttons.
 * Lets the BrainLover choose between:
 *   1. Send just a reminder/poke (quick, no video)
 *   2. Include a recommended video (opens the video picker + optional message)
 *
 * Reuses sendBrainLoverInteraction and fetchPlaylistVideos — no new data layer.
 */
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Bell, Video, Send, ChevronLeft, ChevronRight, Shuffle, Play, Heart, MessageSquare, Zap } from "lucide-react";
import { fetchPlaylistVideos, YouTubeVideo, isVideoLiked, likeVideo, unlikeVideo } from "@/lib/youtube";
import { sendBrainLoverInteraction } from "@/lib/brainloverInteractions";
import { addFreeBrainPoints } from "@/lib/scoreManager";
import { useToast } from "@/hooks/use-toast";

type FlowMode = "remind" | "raiseStanding";

interface EncourageFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: FlowMode;
  patientId: string;
  patientName: string;
  caregiverId: string;
  caregiverEmail?: string;
  freeBrainScore?: number;
  onBoostComplete?: () => void;
}

export function EncourageFlowModal({
  isOpen,
  onClose,
  mode,
  patientId,
  patientName,
  caregiverId,
  caregiverEmail,
  freeBrainScore = 0,
  onBoostComplete,
}: EncourageFlowModalProps) {
  const { t } = useTranslation();
  const { toast } = useToast();

  // "choice" = pick poke-only or include-video; "video" = browsing videos; "sending" = in-flight
  const [step, setStep] = useState<"choice" | "video">("choice");
  const [playlistVideos, setPlaylistVideos] = useState<YouTubeVideo[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [encouragingMessage, setEncouragingMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep("choice");
      setEncouragingMessage("");
    }
  }, [isOpen]);

  // Load videos when entering video step
  useEffect(() => {
    if (isOpen && step === "video" && playlistVideos.length === 0) {
      loadVideos();
    }
  }, [isOpen, step]);

  const loadVideos = async () => {
    const videos = await fetchPlaylistVideos();
    const shuffled = [...videos].sort(() => 0.5 - Math.random());
    setPlaylistVideos(shuffled);
    setCurrentIndex(0);
  };

  useEffect(() => {
    const currentVideo = playlistVideos[currentIndex];
    if (currentVideo?.id) setIsLiked(isVideoLiked(currentVideo.id));
  }, [currentIndex, playlistVideos]);

  const senderName = caregiverEmail?.split("@")[0] || "BrainLover";
  const firstName = patientName.split(" ")[0];
  const currentVideo = playlistVideos[currentIndex] || null;

  const handleNext = () => setCurrentIndex((p) => (p + 1) % playlistVideos.length);
  const handlePrev = () => setCurrentIndex((p) => (p - 1 + playlistVideos.length) % playlistVideos.length);
  const handleShuffle = () => {
    if (playlistVideos.length <= 1) return;
    const shuffled = [...playlistVideos].sort(() => 0.5 - Math.random());
    setPlaylistVideos(shuffled);
    setCurrentIndex(0);
  };

  const handleToggleLike = () => {
    if (!currentVideo?.id) return;
    if (isLiked) { unlikeVideo(currentVideo.id); setIsLiked(false); }
    else { likeVideo(currentVideo.id); setIsLiked(true); }
  };

  // ── Send poke-only (no video, no boost) ──
  const handleSendPokeOnly = async () => {
    setIsSending(true);
    try {
      await sendBrainLoverInteraction(patientId, caregiverId, senderName, "poke");

      toast({
        title: t("encourageFlow.pokeSentTitle", "Reminder Sent! ⚡"),
        description: t("encourageFlow.pokeSentDesc", "Sent a friendly reminder to {{name}}.", { name: patientName }),
      });
      onClose();
    } catch (e) {
      toast({ title: t("encourageFlow.errorTitle", "Failed to send"), variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  // ── Send poke + recommended video (+50 boost in raiseStanding mode) ──
  const handleSendWithVideo = async () => {
    if (!currentVideo) return;
    setIsSending(true);
    try {
      await sendBrainLoverInteraction(patientId, caregiverId, senderName, "recommend_video", {
        video: currentVideo,
        customMessage: encouragingMessage.trim() || undefined,
      });

      // raiseStanding mode: video recommendation gives +50 boost
      if (mode === "raiseStanding") {
        await applyScoreBoost();
      }

      toast({
        title: t("encourageFlow.videoSentTitle", "Video Recommended! 🎬"),
        description: t("encourageFlow.videoSentDesc", "Sent \"{{title}}\" to {{name}}.", { title: currentVideo.title, name: patientName }),
      });
      onClose();
    } catch (e) {
      toast({ title: t("encourageFlow.errorTitle", "Failed to send"), variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  // ── Score boost helper (+50 points via scoreManager) ──
  const applyScoreBoost = async () => {
    await addFreeBrainPoints(patientId, 50);
    onBoostComplete?.();
  };

  const isRaise = mode === "raiseStanding";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            {isRaise ? (
              <Zap className="h-5 w-5 text-primary animate-bounce" />
            ) : (
              <Bell className="h-5 w-5 text-primary" />
            )}
            {isRaise
              ? t("encourageFlow.raiseTitle", "Raise Standing for {{name}}", { name: firstName })
              : t("encourageFlow.remindTitle", "Remind {{name}} to Move", { name: firstName })}
          </DialogTitle>
          <DialogDescription>
            {isRaise
              ? t("encourageFlow.raiseDesc", "Send a quick movement boost to help {{name}} earn +50 points and climb the leaderboard.", { name: firstName })
              : t("encourageFlow.remindDesc", "Send {{name}} a friendly nudge to get moving today.", { name: firstName })}
          </DialogDescription>
        </DialogHeader>

        {step === "choice" && (
          <div className="space-y-3 py-2">
            {/* Option 1: Poke only */}
            <button
              onClick={handleSendPokeOnly}
              disabled={isSending}
              className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-border bg-card hover:border-primary hover:bg-primary/5 transition-all text-left group"
            >
              <div className="h-10 w-10 rounded-full bg-warning/15 flex items-center justify-center shrink-0">
                <Bell className="h-5 w-5 text-warning" />
              </div>
              <div className="flex-1">
                <div className="font-bold text-sm text-foreground">
                  {t("encourageFlow.justReminder", "Just send a reminder")}
                </div>
                <p className="text-xs text-muted-foreground">
                  {isRaise
                    ? t("encourageFlow.justReminderRaiseDesc", "Send a quick nudge (no point boost)")
                    : t("encourageFlow.justReminderDesc", "Quick poke, no video attached")}
                </p>
              </div>
              <Send className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </button>

            {/* Option 2: Include a video */}
            <button
              onClick={() => setStep("video")}
              className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-border bg-card hover:border-primary hover:bg-primary/5 transition-all text-left group"
            >
              <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                <Video className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="font-bold text-sm text-foreground">
                  {t("encourageFlow.includeVideo", "Include a recommended video")}
                </div>
                <p className="text-xs text-muted-foreground">
                  {isRaise
                    ? t("encourageFlow.includeVideoRaiseDesc", "Pick a video + boost +50 points")
                    : t("encourageFlow.includeVideoDesc", "Browse and attach a movement video")}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </button>
          </div>
        )}

        {step === "video" && (
          <div className="space-y-4 py-1">
            {/* Back to choice */}
            <button
              onClick={() => setStep("choice")}
              className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              {t("encourageFlow.backToOptions", "Back")}
            </button>

            {currentVideo ? (
              <>
                <div className="relative aspect-video bg-black/90 rounded-2xl overflow-hidden border border-border group shadow-md">
                  {currentVideo.thumbnail ? (
                    <img src={currentVideo.thumbnail} alt={currentVideo.title} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <Play className="h-12 w-12 text-muted-foreground/40" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 p-3 flex flex-col justify-between">
                    <div className="flex justify-between items-center">
                      <Badge variant="secondary" className="bg-black/60 backdrop-blur-md text-white border-none text-[10px] font-semibold">
                        {t("encourageFlow.optionOf", "Option {{current}} of {{total}}", { current: currentIndex + 1, total: playlistVideos.length })}
                      </Badge>
                      <Button size="icon" variant="ghost" onClick={handleShuffle} title={t("encourageFlow.shuffle", "Shuffle")} className="h-7 w-7 text-white hover:bg-white/20 rounded-full">
                        <Shuffle className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="text-white text-sm font-bold line-clamp-2 drop-shadow-md">{currentVideo.title}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 bg-muted/40 p-2 rounded-xl border border-border/50">
                  <Button variant="outline" size="sm" onClick={handlePrev} disabled={playlistVideos.length <= 1} className="gap-1 text-xs font-semibold">
                    <ChevronLeft className="h-4 w-4" /> {t("encourageFlow.previous", "Previous")}
                  </Button>
                  <Button variant={isLiked ? "default" : "ghost"} size="sm" onClick={handleToggleLike} className="gap-1 text-xs font-semibold">
                    <Heart className={`h-3.5 w-3.5 ${isLiked ? "fill-current" : ""}`} />
                    {isLiked ? t("encourageFlow.liked", "Liked") : t("encourageFlow.like", "Like")}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleNext} disabled={playlistVideos.length <= 1} className="gap-1 text-xs font-semibold">
                    {t("encourageFlow.next", "Next")} <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="py-12 text-center text-xs text-muted-foreground">
                {t("encourageFlow.loading", "Loading movement videos...")}
              </div>
            )}

            {/* Optional encouraging message */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <MessageSquare className="h-3.5 w-3.5" />
                {t("encourageFlow.messageLabel", "Add an encouraging message (optional)")}
              </label>
              <Textarea
                value={encouragingMessage}
                onChange={(e) => setEncouragingMessage(e.target.value)}
                placeholder={t("encourageFlow.messagePlaceholder", "Write a few words of encouragement...")}
                maxLength={200}
                rows={2}
                className="text-sm resize-none"
              />
            </div>

            <DialogFooter className="pt-2 border-t border-border/40">
              <Button variant="outline" onClick={onClose} className="text-xs font-semibold">
                {t("encourageFlow.cancel", "Cancel")}
              </Button>
              <Button
                onClick={handleSendWithVideo}
                disabled={!currentVideo || isSending}
                className="gap-2 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isRaise ? <Zap className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />}
                {isRaise
                  ? t("encourageFlow.sendAndBoost", "Send + Boost +50")
                  : t("encourageFlow.sendVideo", "Send Video")}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
