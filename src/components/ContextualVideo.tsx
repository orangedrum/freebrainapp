import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { VideoPlayer } from "@/components/shared/VideoPlayer";
import { useTranslation } from "react-i18next";

interface ContextualVideoProps {
  category: string;
  title?: string;
  description?: string;
  badgeText?: string;
}

const FALLBACKS: Record<string, any> = {
  'flare-up': {
    title: "3-Minute Guided Breathing",
    description: "A gentle exercise you can do from bed.",
    videoId: "tEmt1Znux58"
  },
  'brain-teaser': {
    title: "Quick Brain Teaser",
    description: "Boost your cognitive function in 3 minutes.",
    videoId: "3E7hkPZ-HTk"
  },
  'high-energy': {
    title: "Team Rally Movement",
    description: "A quick high-energy stretch to boost the team!",
    videoId: "L_xrDAtykMI"
  }
};

export function ContextualVideo({ category, title, description, badgeText }: ContextualVideoProps) {
  const { t } = useTranslation();
  const [video, setVideo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [videoError, setVideoError] = useState(false);

  const fetchVideo = useCallback(async () => {
    setLoading(true);
    try {
      const { getRandomPlaylistVideo } = await import("@/lib/youtube");
      const randomVid = await getRandomPlaylistVideo();
      setVideo({
        title: randomVid.title,
        description: randomVid.description,
        videoId: randomVid.id,
        isVertical: randomVid.isVertical,
      });
    } catch {
      setVideo(FALLBACKS[category] || FALLBACKS['flare-up']);
    }
    setLoading(false);
  }, [category]);

  useEffect(() => {
    fetchVideo();
  }, [fetchVideo]);

  if (loading) {
    return <div className="animate-pulse h-64 bg-muted rounded-xl w-full"></div>;
  }

  if (!video) return null;

  return (
    <div className="bg-muted/50 border-2 border-primary/20 rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4">
      <div className="p-6 md:p-8 flex flex-col md:flex-row gap-8 items-center">
        <div className="flex-1 space-y-4">
          {badgeText && <Badge variant="outline" className="bg-background">{badgeText}</Badge>}
          <h3 className="text-2xl font-bold">{title || video.title}</h3>
          <p className="text-lg text-muted-foreground">
            {description || video.description}
          </p>
          {videoError && (
            <p className="text-sm text-muted-foreground italic">
              {t("contextualVideo.swappingVideo", "Swapping to a new video...")}
            </p>
          )}
        </div>
        <div className="w-full md:w-1/2">
          <VideoPlayer
            videoId={video.videoId}
            isVertical={video.isVertical}
            onError={() => {
              setVideoError(true);
              fetchVideo();
            }}
            showLike={false}
            showExpand={false}
            showControls
            className="rounded-xl"
          />
        </div>
      </div>
    </div>
  );
}
