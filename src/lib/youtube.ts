// ─── Barrel re-export for the YouTube module ──────────────────
// All imports from "@/lib/youtube" continue to work unchanged.
//
// Module structure:
//   types.ts     — shared interfaces
//   api.ts       — YouTube Data API calls (fetch, parse, filter)
//   storage.ts   — Supabase read-through with localStorage cache
//   selection.ts — video fetching + smart random selection
//
// Admin playlist changes propagate to ALL devices via Supabase.

// Types
export type {
  YouTubePlaylist,
  YouTubeVideo,
  YouTubeSingleVideo,
} from "./youtube/types";

// API
export {
  parseDuration,
  detectVerticalOrientation,
  fetchVideoDetails,
  fetchPlaylistMetadata,
  fetchVideoMetadata,
  fetchSinglePlaylistVideos,
  getSingleVideoYouTubeVideo,
} from "./youtube/api";

// Storage
export {
  DEFAULT_PLAYLIST_ID,
  extractPlaylistId,
  extractVideoId,
  getStoredPlaylists,
  getCachedPlaylists,
  getActivePlaylistIds,
  getCachedActivePlaylistIds,
  setActivePlaylistIds,
  getActivePlaylistId,
  setActivePlaylistId,
  getGlobalDefaultPlaylistIds,
  getGlobalDefaultVideoIds,
  setGlobalDefaultPlaylistIds,
  toggleGlobalDefault,
  forceSyncAllPlaylistsToSupabase,
  addYouTubePlaylist,
  removeYouTubePlaylist,
  getStoredSingleVideos,
  getCachedSingleVideos,
  getActiveSingleVideoIds,
  toggleActiveSingleVideo,
  addYouTubeVideo,
  removeYouTubeVideo,
  getLikedVideoIds,
  likeVideo,
  unlikeVideo,
  isVideoLiked,
  purgeInvalidPlaylists,
} from "./youtube/storage";

// Selection
export {
  fetchPlaylistVideos,
  getRandomPlaylistVideo,
  clearPlaylistVideoCache,
} from "./youtube/selection";

// Player
export { YouTubePlayerWrapper, type YouTubePlayerCallbacks } from "./youtube/player";
