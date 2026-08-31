/**
 * BrainLoverVideoCard — inline (non-modal) video recommendation picker.
 *
 * This is a card-based version of the RecommendVideoModal, letting the
 * BrainLover browse, shuffle, like, add a message, and send a video
 * recommendation — all without opening a modal.
 *
 * Reuses fetchPlaylistVideos, likeVideo/unlikeVideo, and
 * sendBrainLoverInteraction — no new data layer.
 */
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Video, ChevronLeft, ChevronRight, Shuffle, Play, Heart, MessageSquare, Send, Loader2, CheckCircle2, Sparkles } from "lucide-react";
import { fetchPlaylistVideos, YouTubeVideo, isVideoLiked, likeVideo, unlikeVideo } from "@/lib/youtube";
import { sendBrainLoverInteraction } from "@/lib/brainloverInteractions";
import { supabase } from "@/lib/supabase";
import { isDevBypassUser } from "@/lib/devBypass";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface BrainLoverVideoCardProps {
  patientId: string;
  patientName: string;
  caregiverId: string;
  caregiverEmail?: string;
}

export function BrainLoverVideoCard({
  patientId,
  patientName,
  caregiverId,
  caregiverEmail,
}: BrainLoverVideoCardProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  // "hasMoved" = true if FreeBrainer has already checked in/moved today.
  // When true, the entire video recommendation UI is replaced with a
  // "come back tomorrow" message + a cheer CTA (if not already cheered).
  const [hasMoved, setHasMoved] = useState(false);
  const [alreadyCheered, setAlreadyCheered] = useState(false);

  const isDevBypass = isDevBypassUser(patientId) || isDevBypassUser(caregiverId);

  useEffect(() => {
    loadVideos();
    checkIfMoved();
    checkIfCheered();
  }, []);

  const checkIfMoved = async () => {
    const todayStr = format(new Date(), "yyyy-MM-dd");

    if (isDevBypass) {
      const mockKey = `fb_mock_checkin_${patientId}_${todayStr}`;
      const raw = localStorage.getItem(mockKey);
      setHasMoved(!!raw);
      return;
    }

    try {
      const { data } = await (supabase as any)
        .from("daily_checkins")
        .select("id,moved")
        .eq("user_id", patientId)
        .eq("checkin_date", todayStr)
        .maybeSingle();
      setHasMoved(!!data && !!data.moved);
    } catch {
      setHasMoved(false);
    }
  };

  const checkIfCheered = async () => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const cheerKey = `fb_encouraged_${patientId}_${todayStr}`;
    if (localStorage.getItem(cheerKey)) {
      setAlreadyCheered(true);
      return;
    }
    if (isDevBypass) return;
    try {
      const { data } = await (supabase as any)
        .from("community_posts")
        .select("id")
        .eq("user_id", patientId)
        .eq("posted_by_id", caregiverId)
        .eq("type", "brainlover_cheer")
        .gte("created_at", `${todayStr}T00:00:00`)
        .limit(1);
      setAlreadyCheered(!!data && data.length > 0);
    } catch {
      // default to not cheered
    }
  };

  const loadVideos = async () => {
    setLoading(true);
    const fetched = await fetchPlaylistVideos();
    const shuffled = [...fetched].sort(() => 0.5 - Math.random());
    setVideos(shuffled);
    setCurrentIndex(0);
    setLoading(false);
  };

  useEffect(() => {
    const v = videos[currentIndex];
    if (v?.id) setIsLiked(isVideoLiked(v.id));
  }, [currentIndex, videos]);

  const currentVideo = videos[currentIndex] || null;

  const handleNext = () => setCurrentIndex((p) => (p + 1) % videos.length);
  const handlePrev = () => setCurrentIndex((p) => (p - 1 + videos.length) % videos.length);
  const handleShuffle = () => {
    if (videos.length <= 1) return;
    const shuffled = [...videos].sort(() => 0.5 - Math.random());
    setVideos(shuffled);
    setCurrentIndex(0);
  };

  const handleToggleLike = () => {
    if (!currentVideo?.id) return;
    if (isLiked) { unlikeVideo(currentVideo.id); setIsLiked(false); }
    else { likeVideo(currentVideo.id); setIsLiked(true); }
  };

  const handleSend = async () => {
    if (!currentVideo) return;
    setSending(true);
    const senderName = caregiverEmail?.split("@")[0] || "BrainLover";
    try {
      await sendBrainLoverInteraction(patientId, caregiverId, senderName, "recommend_video", {
        video: currentVideo,
        customMessage: message.trim() || undefined,
      });
      // Track per-day video recommendation for the DailyActionsIndicator
      const todayStr = new Date().toISOString().split("T")[0];
      localStorage.setItem(`fb_video_recommended_${patientId}_${todayStr}`, "1");
      window.dispatchEvent(new CustomEvent("brainlover_interaction_sent"));
      toast({
        title: t("loveTheirBrain.videoSentTitle", "Video Recommended! 🎬"),
        description: t("loveTheirBrain.videoSentDesc", "Sent \"{{title}}\" to {{name}}.", { title: currentVideo.title, name: patientName }),
      });
      setMessage("");
    } catch (e) {
      toast({ title: t("loveTheirBrain.videoError", "Failed to send"), variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleCheer = async () => {
    setSending(true);
    const senderName = caregiverEmail?.split("@")[0] || "BrainLover";
    try {
      await sendBrainLoverInteraction(patientId, caregiverId, senderName, "cheer");
      setAlreadyCheered(true);
      toast({
        title: t("loveTheirBrain.cheerSentTitle", "Cheer Sent! ❤️"),
        description: t("loveTheirBrain.cheerSentDesc", "You cheered for {{name}} today!", { name: patientName }),
      });
    } catch (e) {
      toast({ title: t("loveTheirBrain.cheerError", "Failed to send cheer"), variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="border-primary/30 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <Video className="h-5 w-5 text-primary" />
          {t("loveTheirBrain.recommendVideoTitle", "Recommend a Movement Video")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
            {t("loveTheirBrain.loadingVideos", "Loading movement videos...")}
          </div>
        ) : hasMoved ? (
          /* ── Already moved state: replace entire video UI ── */
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 border-2 border-emerald-500/30">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-bold text-foreground">
                {t("loveTheirBrain.alreadyMovedTitle", "{{name}} already moved today!", { name: patientName.split(" ")[0] })}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("loveTheirBrain.alreadyMovedDesc", "Come back tomorrow to move together again.")}
              </p>
            </div>
            {alreadyCheered ? (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-2">
                <Sparkles className="h-4 w-4 text-emerald-500" />
                <span className="text-sm font-semibold text-emerald-600">
                  {t("loveTheirBrain.alreadyCheered", "You already cheered for {{name}} today!", { name: patientName.split(" ")[0] })}
                </span>
              </div>
            ) : (
              <Button
                onClick={handleCheer}
                disabled={sending}
                className="gap-2 text-sm font-bold bg-emerald-500 text-white hover:bg-emerald-600"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Heart className="h-4 w-4 fill-current" />}
                {t("loveTheirBrain.cheerForThem", "Cheer for {{name}}", { name: patientName.split(" ")[0] })}
              </Button>
            )}
          </div>
        ) : currentVideo ? (
          /* ── Normal recommendation UI (FreeBrainer hasn't moved) ── */
          <>
            <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/30 px-3 py-2">
              <Video className="h-5 w-5 text-amber-500 shrink-0" />
              <p className="text-sm font-semibold text-amber-600">
                {t("loveTheirBrain.notMovedYet", "{{name}} hasn't moved yet today — send them a video to get them going!", { name: patientName.split(" ")[0] })}
              </p>
            </div>
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
                    {t("loveTheirBrain.optionOf", "Option {{current}} of {{total}}", { current: currentIndex + 1, total: videos.length })}
                  </Badge>
                  <Button size="icon" variant="ghost" onClick={handleShuffle} title={t("loveTheirBrain.shuffle", "Shuffle")} className="h-7 w-7 text-white hover:bg-white/20 rounded-full">
                    <Shuffle className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="text-white text-sm font-bold line-clamp-2 drop-shadow-md">{currentVideo.title}</div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 bg-muted/40 p-2 rounded-xl border border-border/50">
              <Button variant="outline" size="sm" onClick={handlePrev} disabled={videos.length <= 1} className="gap-1 text-xs font-semibold">
                <ChevronLeft className="h-4 w-4" /> {t("loveTheirBrain.previous", "Previous")}
              </Button>
              <Button variant={isLiked ? "default" : "ghost"} size="sm" onClick={handleToggleLike} className="gap-1 text-xs font-semibold">
                <Heart className={`h-3.5 w-3.5 ${isLiked ? "fill-current" : ""}`} />
                {isLiked ? t("loveTheirBrain.liked", "Liked") : t("loveTheirBrain.like", "Like")}
              </Button>
              <Button variant="outline" size="sm" onClick={handleNext} disabled={videos.length <= 1} className="gap-1 text-xs font-semibold">
                {t("loveTheirBrain.next", "Next")} <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <MessageSquare className="h-3.5 w-3.5" />
                {t("loveTheirBrain.messageLabel", "Add an encouraging message (optional)")}
              </label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t("loveTheirBrain.messagePlaceholder", "Write a few words of encouragement...")}
                maxLength={200}
                rows={2}
                className="text-sm resize-none"
              />
            </div>

            <Button
              onClick={handleSend}
              disabled={sending}
              className="w-full gap-2 text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {t("loveTheirBrain.sendVideo", "Send This Video")}
            </Button>
          </>
        ) : (
          <div className="py-8 text-center text-sm text-muted-foreground">
            {t("loveTheirBrain.noVideos", "No videos available right now.")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
