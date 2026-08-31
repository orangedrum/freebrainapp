import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Video, Send, ChevronLeft, ChevronRight, Shuffle, Play, Heart, MessageSquare } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { fetchPlaylistVideos, YouTubeVideo, isVideoLiked, likeVideo, unlikeVideo } from "@/lib/youtube";
import { useToast } from "@/hooks/use-toast";
import { sendBrainLoverInteraction } from "@/lib/brainloverInteractions";

interface RecommendVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  patientName: string;
  senderName: string;
  /** If provided, the selected video + message is also sent to these user IDs */
  bulkRecipientIds?: string[];
}

export function RecommendVideoModal({
  isOpen,
  onClose,
  patientId,
  patientName,
  senderName,
  bulkRecipientIds,
}: RecommendVideoModalProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [playlistVideos, setPlaylistVideos] = useState<YouTubeVideo[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [sentVideoTitle, setSentVideoTitle] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [encouragingMessage, setEncouragingMessage] = useState("");

  // Reset the message whenever the modal opens
  useEffect(() => {
    if (isOpen) setEncouragingMessage("");
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && patientId) {
      loadVideos();
      const existing = localStorage.getItem(`fb_recommended_video_${patientId}`);
      if (existing) {
        try {
          const parsed = JSON.parse(existing);
          setSentVideoTitle(parsed.video?.title || null);
        } catch (e) {}
      }
    }
  }, [isOpen, patientId]);

  useEffect(() => {
    const currentVideo = playlistVideos[currentIndex];
    if (currentVideo?.id) {
      setIsLiked(isVideoLiked(currentVideo.id));
    }
  }, [currentIndex, playlistVideos]);

  const loadVideos = async () => {
    const videos = await fetchPlaylistVideos();
    const shuffled = [...videos].sort(() => 0.5 - Math.random());
    setPlaylistVideos(shuffled);
    setCurrentIndex(0);
  };

  const handleNext = () => {
    if (playlistVideos.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % playlistVideos.length);
  };

  const handlePrev = () => {
    if (playlistVideos.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + playlistVideos.length) % playlistVideos.length);
  };

  const handleShuffle = () => {
    if (playlistVideos.length <= 1) return;
    const shuffled = [...playlistVideos].sort(() => 0.5 - Math.random());
    setPlaylistVideos(shuffled);
    setCurrentIndex(0);
  };

  const handleToggleLike = () => {
    const currentVideo = playlistVideos[currentIndex];
    if (!currentVideo?.id) return;
    if (isLiked) {
      unlikeVideo(currentVideo.id);
      setIsLiked(false);
    } else {
      likeVideo(currentVideo.id);
      setIsLiked(true);
      toast({
        title: t("recommendVideo.likedTitle", "Video Liked! ❤️"),
        description: t("recommendVideo.likedDesc", "This video will appear more often in recommendations."),
      });
    }
  };

  const currentVideo = playlistVideos[currentIndex] || null;

  const handleSend = async () => {
    if (!currentVideo || !patientId) return;
    setIsSending(true);

    try {
      const sender = senderName || t("recommendVideo.defaultSender", "Your BrainLover");
      const videoPayload = currentVideo;
      const message = encouragingMessage.trim() || undefined;

      // Send to the primary recipient
      await sendBrainLoverInteraction(patientId, "", sender, 'recommend_video', {
        video: videoPayload,
        customMessage: message,
      });

      // If bulk recipients are provided, send the same video to each
      if (bulkRecipientIds && bulkRecipientIds.length > 0) {
        for (const rid of bulkRecipientIds) {
          if (rid === patientId) continue; // skip primary (already sent)
          try {
            await sendBrainLoverInteraction(rid, "", sender, 'recommend_video', {
              video: videoPayload,
              customMessage: message,
            });
          } catch { /* continue on individual failure */ }
        }
      }

      setSentVideoTitle(currentVideo.title);
      const successName = bulkRecipientIds && bulkRecipientIds.length > 0
        ? t("recommendVideo.allTeammates", "all teammates")
        : patientName;
      toast({
        title: t("recommendVideo.toastSuccessTitle", "Video Recommended! 🎬"),
        description: t("recommendVideo.toastSuccessDesc", "Sent \"{{title}}\" to {{name}}.", { title: currentVideo.title, name: successName }),
      });
      onClose();
    } catch (e) {
      toast({ title: t("recommendVideo.toastErrorTitle", "Failed to send recommendation"), variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Video className="h-5 w-5 text-primary" />
            {t("recommendVideo.title", "Recommend a Movement Video")}
          </DialogTitle>
          <DialogDescription>
            {t("recommendVideo.description", "Swap through to pick your favorite video for {{name}}!", { name: patientName })}
          </DialogDescription>
        </DialogHeader>

        {sentVideoTitle && (
          <div className="bg-primary/10 border border-primary/20 p-2.5 rounded-lg text-xs flex items-center justify-between text-primary">
            <span className="font-medium truncate max-w-[260px]">{t("recommendVideo.active", "Active:")}"{sentVideoTitle}"</span>
            <Badge variant="secondary" className="text-[10px] shrink-0">{t("recommendVideo.currentBadge", "Current")}</Badge>
          </div>
        )}

        {currentVideo ? (
          <div className="space-y-4 py-1">
            <div className="relative aspect-video bg-black/90 rounded-2xl overflow-hidden border border-border group shadow-md">
              {currentVideo.thumbnail ? (
                <img
                  src={currentVideo.thumbnail}
                  alt={currentVideo.title}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <Play className="h-12 w-12 text-muted-foreground/40" />
                </div>
              )}
              
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 p-3 flex flex-col justify-between">
                <div className="flex justify-between items-center">
                  <Badge variant="secondary" className="bg-black/60 backdrop-blur-md text-white border-none text-[10px] font-semibold">
                    {t("recommendVideo.optionOf", "Option {{current}} of {{total}}", { current: currentIndex + 1, total: playlistVideos.length })}
                  </Badge>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleShuffle}
                    title={t("recommendVideo.shuffle", "Shuffle videos")}
                    className="h-7 w-7 text-white hover:bg-white/20 rounded-full"
                  >
                    <Shuffle className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="text-white text-sm font-bold line-clamp-2 drop-shadow-md">
                  {currentVideo.title}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 bg-muted/40 p-2 rounded-xl border border-border/50">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrev}
                disabled={playlistVideos.length <= 1}
                className="gap-1 text-xs font-semibold"
              >
                <ChevronLeft className="h-4 w-4" /> {t("recommendVideo.previous", "Previous")}
              </Button>

              <Button
                variant={isLiked ? "default" : "ghost"}
                size="sm"
                onClick={handleToggleLike}
                className="gap-1 text-xs font-semibold"
              >
                <Heart className={`h-3.5 w-3.5 ${isLiked ? "fill-current" : ""}`} />
                {isLiked ? t("recommendVideo.liked", "Liked") : t("recommendVideo.like", "Like")}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleNext}
                disabled={playlistVideos.length <= 1}
                className="gap-1 text-xs font-semibold"
              >
                {t("recommendVideo.next", "Next")} <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-muted-foreground">
            {t("recommendVideo.loading", "Loading movement videos...")}
          </div>
        )}

        {/* Optional encouraging message */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <MessageSquare className="h-3.5 w-3.5" />
            {t("recommendVideo.encouragingMessageLabel", "Add an encouraging message (optional)")}
          </label>
          <Textarea
            value={encouragingMessage}
            onChange={(e) => setEncouragingMessage(e.target.value)}
            placeholder={t("recommendVideo.encouragingMessagePlaceholder", "Write a few words of encouragement...")}
            maxLength={200}
            rows={2}
            className="text-sm resize-none"
          />
          {encouragingMessage.length > 0 && (
            <span className="text-[10px] text-muted-foreground/60">
              {encouragingMessage.length}/200
            </span>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
          <Button variant="outline" onClick={onClose} className="text-xs font-semibold">
            {t("recommendVideo.cancel", "Cancel")}
          </Button>
          <Button
            onClick={handleSend}
            disabled={!currentVideo || isSending}
            className="gap-2 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Send className="h-3.5 w-3.5" /> {t("recommendVideo.send", "Send This Video")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
