// ─── YouTube IFrame Player API wrapper ─────────────────────────
// Manages a single YT.Player instance with:
//   - onError auto-swap (blocked/unavailable videos → callback)
//   - onStateChange watch tracking (plays → callback)
//   - programmatic pause/destroy for immersive ↔ inline transitions
//
// Usage:
//   const player = new YouTubePlayerWrapper(containerEl, {
//     videoId: "abc123",
//     onReady: () => { ... },
//     onError: () => { swapVideo(); },
//     onWatched: () => { markWatched(); },
//   });
//   player.loadVideo("newId");
//   player.pause();
//   player.destroy();

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<void> | null = null;

/** Load the YouTube IFrame API once globally */
function loadYouTubeAPI(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT && window.YT.Player) return Promise.resolve();
  if (apiPromise) return apiPromise;

  apiPromise = new Promise<void>((resolve) => {
    // If the script tag already exists, just wait
    const existing = document.getElementById("youtube-iframe-api");
    if (existing) {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        resolve();
      };
      return;
    }

    const tag = document.createElement("script");
    tag.id = "youtube-iframe-api";
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);

    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
  });

  return apiPromise;
}

export interface YouTubePlayerCallbacks {
  onReady?: () => void;
  onError?: (errorCode: number) => void;
  onWatched?: () => void; // called when user has watched enough (e.g., played to end or >30s)
  onStateChange?: (isPlaying: boolean) => void; // called when play/pause state changes
}

export class YouTubePlayerWrapper {
  private player: any = null;
  private container: HTMLElement;
  private playerHost: HTMLDivElement | null = null;
  private callbacks: YouTubePlayerCallbacks;
  private currentVideoId: string | null = null;
  private watchThresholdMs = 30_000; // 30s of playback = "watched"
  private watchTimer: ReturnType<typeof setTimeout> | null = null;
  private hasFiredWatched = false;

  constructor(container: HTMLElement, callbacks: YouTubePlayerCallbacks = {}) {
    this.container = container;
    this.callbacks = callbacks;
  }

  /** Load (or replace) a video by ID. Autoplay starts automatically. */
  async loadVideo(videoId: string): Promise<void> {
    this.currentVideoId = videoId;
    this.hasFiredWatched = false;
    this.clearWatchTimer();

    await loadYouTubeAPI();

    if (!window.YT || !window.YT.Player) {
      console.warn("[FB-Player] YT API not available");
      return;
    }

    // If player already exists, just cue/load new video
    if (this.player && this.player.loadVideoById) {
      this.player.loadVideoById(videoId);
      this.startWatchTimer();
      return;
    }

    // YouTube IFrame API replaces the host element with an iframe.
    // We create a child div as the host so the container stays intact
    // (buttons, siblings, etc. survive). On destroy, we remove the child.
    this.playerHost = document.createElement("div");
    this.playerHost.style.width = "100%";
    this.playerHost.style.height = "100%";
    this.container.appendChild(this.playerHost);

    this.player = new window.YT.Player(this.playerHost, {
      videoId,
      playerVars: {
        autoplay: 1,
        rel: 0,
        modestbranding: 1,
        playsinline: 1,
        cast: 1, // Show cast button in embed (Chrome/Android with Chromecast)
      },
      events: {
        onReady: () => {
          this.callbacks.onReady?.();
          this.startWatchTimer();
        },
        onStateChange: (e: any) => {
          // YT.PlayerState.ENDED = 0
          if (e.data === 0) {
            this.fireWatched();
            this.callbacks.onStateChange?.(false);
          }
          // YT.PlayerState.PLAYING = 1
          if (e.data === 1) {
            this.startWatchTimer();
            this.callbacks.onStateChange?.(true);
          }
          // YT.PlayerState.PAUSED = 2
          if (e.data === 2) {
            this.clearWatchTimer();
            this.callbacks.onStateChange?.(false);
          }
          // YT.PlayerState.BUFFERING = 3
          if (e.data === 3) {
            this.callbacks.onStateChange?.(false);
          }
        },
        onError: (e: any) => {
          // 2 = invalid param, 5 = HTML5 error, 100 = not found, 101 = embed not allowed, 150 = embed not allowed
          console.warn("[FB-Player] YouTube player error:", e.data);
          this.callbacks.onError?.(e.data);
        },
      },
    });
  }

  private startWatchTimer() {
    this.clearWatchTimer();
    if (this.hasFiredWatched) return;
    this.watchTimer = setTimeout(() => {
      this.fireWatched();
    }, this.watchThresholdMs);
  }

  private clearWatchTimer() {
    if (this.watchTimer) {
      clearTimeout(this.watchTimer);
      this.watchTimer = null;
    }
  }

  private fireWatched() {
    if (this.hasFiredWatched) return;
    this.hasFiredWatched = true;
    this.clearWatchTimer();
    this.callbacks.onWatched?.();
  }

  /** Pause playback if currently playing */
  pause(): void {
    if (this.player && this.player.pauseVideo) {
      this.player.pauseVideo();
    }
  }

  /** Resume playback */
  play(): void {
    if (this.player && this.player.playVideo) {
      this.player.playVideo();
    }
  }

  /** Get current video ID */
  getCurrentVideoId(): string | null {
    return this.currentVideoId;
  }

  /** Get the underlying iframe element (for Fullscreen API) */
  getIframe(): HTMLIFrameElement | null {
    if (this.player && this.player.getIframe) {
      try {
        return this.player.getIframe() as HTMLIFrameElement;
      } catch {
        return null;
      }
    }
    return null;
  }

  /** Seek to a specific time in seconds */
  seekTo(seconds: number): void {
    if (this.player && this.player.seekTo) {
      try {
        this.player.seekTo(seconds, true);
      } catch {
        // ignore
      }
    }
  }

  /** Get current playback position in seconds */
  getCurrentTime(): number {
    if (this.player && this.player.getCurrentTime) {
      try {
        return this.player.getCurrentTime() as number;
      } catch {
        return 0;
      }
    }
    return 0;
  }

  /** Get video duration in seconds */
  getDuration(): number {
    if (this.player && this.player.getDuration) {
      try {
        return this.player.getDuration() as number;
      } catch {
        return 0;
      }
    }
    return 0;
  }

  /** Destroy the player instance and clean up DOM */
  destroy(): void {
    this.clearWatchTimer();
    if (this.player && this.player.destroy) {
      try {
        this.player.destroy();
      } catch {
        // ignore — already destroyed
      }
    }
    this.player = null;
    // Remove the player host div so the container is clean for next mount
    if (this.playerHost && this.playerHost.parentNode) {
      this.playerHost.parentNode.removeChild(this.playerHost);
    }
    this.playerHost = null;
  }
}
