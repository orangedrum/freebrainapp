import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Heart, Cast } from "lucide-react";
import { isVideoLiked, likeVideo, unlikeVideo } from "@/lib/youtube";
import { VideoPlayer } from "@/components/shared/VideoPlayer";
import { CastToTVModal } from "@/components/shared/CastToTVModal";
import type { CheckInPerspective } from "./CheckInFlow";

interface CheckInVideoStepProps {
  suggestedVideo: any;
  onSwapVideo: (maxDurationSeconds?: number) => void;
  onFinish: () => void;
  onAbort: () => void;
  onBackToSwap: () => void;
  onExitImmersive: () => void;
  perspective?: CheckInPerspective;
}

export const CheckInVideoStep: React.FC<CheckInVideoStepProps> = ({
  suggestedVideo,
  onSwapVideo,
  onFinish,
  onAbort,
  onBackToSwap,
  onExitImmersive,
  perspective = "self",
}) => {
  const { t } = useTranslation();
  const pfx = perspective === "proxy" ? "proxy." : "";
  const [isLiked, setIsLiked] = useState(false);
  const [showCastModal, setShowCastModal] = useState(false);

  useEffect(() => {
    if (suggestedVideo?.id) {
      setIsLiked(isVideoLiked(suggestedVideo.id));
    }
  }, [suggestedVideo?.id]);

  const handleToggleLike = () => {
    if (!suggestedVideo?.id) return;
    if (isLiked) {
      unlikeVideo(suggestedVideo.id);
      setIsLiked(false);
    } else {
      likeVideo(suggestedVideo.id);
      setIsLiked(true);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
      {/* Reusable video player with inline controls + immersive mode */}
      <VideoPlayer
        videoId={suggestedVideo?.id || ""}
        isVertical={suggestedVideo?.isVertical}
        onError={() => onSwapVideo()}
        onWatched={() => {}}
        showLike
        isLiked={isLiked}
        onToggleLike={handleToggleLike}
        showExpand
        showControls
        onExitImmersive={onExitImmersive}
      />

      {/* Cast to TV link — appears on the video playing screen */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => setShowCastModal(true)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors py-1"
          aria-label={t("cast.cta", "Cast to TV")}
        >
          <Cast className="h-4 w-4" />
          {t("cast.cta", "Cast to TV")}
        </button>
      </div>

      {/* Like button — separate from the player overlay for accessibility */}
      {suggestedVideo?.id && (
        <div className="flex justify-center">
          <Button
            variant={isLiked ? "default" : "outline"}
            size="sm"
            onClick={handleToggleLike}
            className="gap-1.5"
          >
            <Heart className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`} />
            {isLiked ? t("checkin.liked", "Liked") : t("checkin.like", "Like")}
          </Button>
        </div>
      )}

      {/* Two CTAs */}
      <div className="flex flex-col items-center gap-3 pt-2">
        <Button
          size="lg"
          className="h-14 min-w-[280px] text-base font-bold"
          onClick={onFinish}
        >
          {t(`checkin.${pfx}finishedFreeing`, "Finished Moving")}
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="h-12 min-w-[280px] text-sm font-semibold"
          onClick={onAbort}
        >
          {t(`checkin.${pfx}abortFreeing`, "Abort Freeing Brain")}
        </Button>
        <button
          type="button"
          onClick={onBackToSwap}
          className="text-sm text-muted-foreground hover:text-primary underline transition-colors mt-1"
        >
          {t("checkin.backToSwap", "Back to swap video")}
        </button>
      </div>

      {/* Cast to TV modal */}
      <CastToTVModal open={showCastModal} onClose={() => setShowCastModal(false)} videoId={suggestedVideo?.id} />
    </div>
  );
};
