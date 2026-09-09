import { useEffect, useRef, useState, type MouseEvent } from "react";
import { Play, Pause, Maximize2, Minimize2, Heart, Loader2 } from "lucide-react";
import { YouTubePlayerWrapper } from "@/lib/youtube";
import { cn } from "@/lib/utils";

interface VideoPlayerProps {
  src?: string;
  poster?: string;
  rotationClass?: string;
  className?: string;
  videoId?: string;
  isVertical?: boolean;
  onError?: () => void;
  onWatched?: () => void;
  onStateChange?: (isPlaying: boolean) => void;
  showLike?: boolean;
  isLiked?: boolean;
  onToggleLike?: () => void;
  showExpand?: boolean;
  onExitImmersive?: () => void;
  showControls?: boolean;
}

/** Video player with a translucent play button overlay that hides on play. */
function Html5Video({ src, poster, rotationClass = "" }: { src: string; poster: string; rotationClass?: string }) {
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlay = (event: MouseEvent<HTMLVideoElement>): void => {
    const video = event.currentTarget;
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  };

  return (
    <div className={`relative mx-auto w-full max-w-[320px] group cursor-pointer ${rotationClass}`}>
      <div className="absolute inset-0 bg-foreground/10 rounded-[2rem] transform scale-105 -z-10"></div>
      <div className="relative rounded-[2rem] overflow-hidden border border-foreground/10 shadow-xl aspect-[9/16] bg-background/20">
        <video
          src={src}
          poster={poster}
          className="w-full h-full object-cover"
          playsInline
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          onClick={togglePlay}
        />
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/20 hover:bg-background/10 transition-colors pointer-events-none">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-foreground/25 backdrop-blur-md text-foreground border border-foreground/40 shadow-2xl group-hover:scale-110 transition-transform">
              <Play className="h-8 w-8 fill-foreground ml-1" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface YouTubeVideoProps {
  videoId: string;
  isVertical?: boolean;
  onError?: () => void;
  onWatched?: () => void;
  onStateChange?: (isPlaying: boolean) => void;
  showLike?: boolean;
  isLiked?: boolean;
  onToggleLike?: () => void;
  showExpand?: boolean;
  onExitImmersive?: () => void;
  showControls?: boolean;
  className?: string;
}

/** YouTube IFrame player with autoplay, like, expand-to-immersive and callbacks. */
function YouTubeVideo({
  videoId,
  isVertical = false,
  onError,
  onWatched,
  onStateChange,
  showLike = false,
  isLiked = false,
  onToggleLike,
  showExpand = false,
  onExitImmersive,
  showControls = false,
  className,
}: YouTubeVideoProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YouTubePlayerWrapper | null>(null);
  const callbacksRef = useRef({ onError, onWatched, onStateChange });
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isImmersive, setIsImmersive] = useState(false);

  callbacksRef.current = { onError, onWatched, onStateChange };

  useEffect(() => {
    if (!videoId || !containerRef.current) return;

    const player = new YouTubePlayerWrapper(containerRef.current, {
      onReady: () => setIsReady(true),
      onError: () => callbacksRef.current.onError?.(),
      onWatched: () => callbacksRef.current.onWatched?.(),
      onStateChange: (playing) => {
        setIsPlaying(playing);
        callbacksRef.current.onStateChange?.(playing);
      },
    });

    playerRef.current = player;
    void player.loadVideo(videoId);

    return () => {
      player.destroy();
      playerRef.current = null;
    };
  }, [videoId]);

  const handleExpand = () => {
    if (isImmersive) {
      onExitImmersive?.();
      setIsImmersive(false);
    } else {
      setIsImmersive(true);
    }
  };

  const controlClass =
    "flex h-10 w-10 items-center justify-center rounded-full bg-background/80 text-foreground shadow-lg hover:bg-background transition-colors";

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden bg-background/20",
        isVertical ? "aspect-[9/16] max-h-[70vh]" : "aspect-video",
        isImmersive && "fixed inset-0 z-50 max-h-none bg-black flex items-center justify-center",
        isVertical && isImmersive && "aspect-auto",
        isImmersive ? "rounded-none" : "rounded-xl",
        !isImmersive && className,
      )}
    >
      <div ref={containerRef} className="absolute inset-0" />

      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/20">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      )}

      {showControls && isReady && (
        <div className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2">
          <button
            type="button"
            aria-label={isPlaying ? "Pause" : "Play"}
            onClick={() => {
              if (isPlaying) {
                playerRef.current?.pause();
              } else {
                playerRef.current?.play();
              }
            }}
            className={`${controlClass} h-12 w-12`}
          >
            {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-0.5" />}
          </button>
        </div>
      )}

      {showLike && onToggleLike && (
        <div className="absolute right-3 top-3 z-10">
          <button
            type="button"
            aria-label="Like"
            onClick={onToggleLike}
            className={cn(controlClass, isLiked && "text-primary")}
          >
            <Heart className={cn("h-5 w-5", isLiked && "fill-current")} />
          </button>
        </div>
      )}

      {showExpand && (
        <div className="absolute left-3 top-3 z-10">
          <button
            type="button"
            aria-label={isImmersive ? "Exit full screen" : "Expand"}
            onClick={handleExpand}
            className={controlClass}
          >
            {isImmersive ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
          </button>
        </div>
      )}
    </div>
  );
}

export const VideoPlayer = (props: VideoPlayerProps) => {
  if (props.videoId) {
    return (
      <YouTubeVideo
        videoId={props.videoId}
        isVertical={props.isVertical}
        onError={props.onError}
        onWatched={props.onWatched}
        onStateChange={props.onStateChange}
        showLike={props.showLike}
        isLiked={props.isLiked}
        onToggleLike={props.onToggleLike}
        showExpand={props.showExpand}
        onExitImmersive={props.onExitImmersive}
        showControls={props.showControls}
        className={props.className}
      />
    );
  }
  if (props.src) {
    return <Html5Video src={props.src} poster={props.poster ?? ""} rotationClass={props.rotationClass} />;
  }
  return null;
};