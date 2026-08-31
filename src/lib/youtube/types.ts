// ─── Shared types for the YouTube module ──────────────────────

export interface YouTubePlaylist {
  id: string;
  title: string;
  description?: string;
  isCustom?: boolean;
  isGlobalDefault?: boolean;
}

export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  embedUrl: string;
  url?: string;
  playlistId?: string;
  durationSeconds?: number;
  isVertical?: boolean;
}

export interface YouTubeSingleVideo {
  id: string;
  title: string;
  description?: string;
  thumbnail: string;
  isCustom: boolean;
}
