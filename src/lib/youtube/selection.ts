// ─── Video selection logic (fetch, merge, smart random) ───────
import { YouTubeVideo } from "./types";
import {
  getActivePlaylistIds,
  getActiveSingleVideoIds,
  getStoredSingleVideos,
  getLikedVideoIds,
} from "./storage";
import {
  fetchSinglePlaylistVideos,
  getSingleVideoYouTubeVideo,
  fetchVideoDetails,
} from "./api";

// In-memory cache for playlist videos (per session)
// MUST be clearable so admin playlist changes propagate without refresh.
// Each entry stores the cached videos AND a timestamp so stale entries
// auto-expire after CACHE_TTL_MS — this is how mobile devices pick up
// admin playlist changes without a manual refresh.
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const playlistVideoCache: Record<string, { videos: YouTubeVideo[]; cachedAt: number }> = {};

/** Clear the in-memory video cache so the next fetch hits Supabase/YouTube fresh. */
export function clearPlaylistVideoCache(): void {
  Object.keys(playlistVideoCache).forEach((k) => delete playlistVideoCache[k]);
}

/** Returns true if a cache entry is stale (older than CACHE_TTL_MS). */
function isCacheStale(cachedAt: number): boolean {
  return Date.now() - cachedAt > CACHE_TTL_MS;
}

// ── PWA foreground detection ──
// When a PWA returns to the foreground (visibilitychange → visible),
// clear the in-memory cache so admin playlist changes are picked up
// without requiring a manual refresh. This is critical for mobile PWAs
// where the app may have been backgrounded for hours.
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      console.log("[FB-DEBUG] visibilitychange → visible, clearing in-memory video cache");
      clearPlaylistVideoCache();
    }
  });
}

/**
 * Fetch videos from ALL active playlists + active single videos,
 * merged into a single pool.
 */
export async function fetchPlaylistVideos(
  playlistId?: string
): Promise<YouTubeVideo[]> {
  if (playlistId) {
    return fetchSinglePlaylistVideos(playlistId);
  }

  // No specific ID → fetch from ALL active playlists and merge
  const activeIds = await getActivePlaylistIds();
  console.log("[FB-DEBUG] fetchPlaylistVideos: activeIds =", activeIds);
  const allVideos: YouTubeVideo[] = [];

  for (const id of activeIds) {
    const entry = playlistVideoCache[id];
    // Use cache only if it exists AND is not stale
    if (entry && entry.videos.length > 0 && !isCacheStale(entry.cachedAt)) {
      console.log("[FB-DEBUG] Using in-memory cache for playlist:", id, "count:", entry.videos.length);
      allVideos.push(...entry.videos);
    } else {
      console.log("[FB-DEBUG] Fetching fresh videos for playlist:", id);
      const vids = await fetchSinglePlaylistVideos(id);
      console.log("[FB-DEBUG] Got", vids.length, "videos for playlist:", id);
      playlistVideoCache[id] = { videos: vids, cachedAt: Date.now() };
      allVideos.push(...vids);
    }
  }

  // Also include active individual videos
  const activeSingleIds = await getActiveSingleVideoIds();
  console.log("[FB-DEBUG] Active single video IDs:", activeSingleIds);
  const storedVideos = await getStoredSingleVideos();
  console.log("[FB-DEBUG] Stored single videos count:", storedVideos.length);
  for (const vidId of activeSingleIds) {
    const stored = storedVideos.find((v) => v.id === vidId);
    if (stored) {
      // Enrich with duration + orientation if not already present
      let durationSeconds = (stored as any).durationSeconds;
      let isVertical = (stored as any).isVertical;
      if (durationSeconds === undefined || isVertical === undefined) {
        const details = await fetchVideoDetails(stored.id);
        durationSeconds = details.durationSeconds;
        isVertical = details.isVertical;
      }
      allVideos.push({
        id: stored.id,
        title: stored.title,
        description: stored.description || "Admin-added movement video.",
        thumbnail:
          stored.thumbnail ||
          `https://img.youtube.com/vi/${stored.id}/hqdefault.jpg`,
        embedUrl: `https://www.youtube.com/embed/${stored.id}?autoplay=1&rel=0`,
        durationSeconds,
        isVertical,
      });
    } else {
      // Fetch details (duration + orientation) for single videos
      allVideos.push(await getSingleVideoYouTubeVideo(vidId));
    }
  }

  console.log("[FB-DEBUG] Total videos in pool:", allVideos.length);
  return allVideos.length > 0
    ? allVideos
    : fetchSinglePlaylistVideos("PL68chWn4OAF_F8msHtkyWcNLXMVAaZSg3");
}

/**
 * Smart random selection:
 * - Liked videos get ~3x weight
 * - When maxDurationSeconds is provided, videos are SORTED by closest
 *   duration match first (not hard-filtered), so users always get the
 *   video closest to their available time.
 */
export async function getRandomPlaylistVideo(
  excludeId?: string,
  playlistId?: string,
  maxDurationSeconds?: number
): Promise<YouTubeVideo> {
  console.log("[FB-DEBUG] getRandomPlaylistVideo called:", { excludeId, playlistId, maxDurationSeconds });
  const videos = await fetchPlaylistVideos(playlistId);
  console.log("[FB-DEBUG] getRandomPlaylistVideo: fetched", videos.length, "videos");
  let filtered = videos;

  if (excludeId && videos.length > 1) {
    filtered = videos.filter((v) => v.id !== excludeId);
  }

  // Sort by closest duration to the user's selected time.
  // Hard-filter: reject videos that exceed the limit by more than 10 minutes
  // (600s). This prevents a 45-min video from being served when the user
  // asked for 10 min, while still allowing a small overshoot for variety.
  if (maxDurationSeconds && maxDurationSeconds > 0) {
    const target = maxDurationSeconds;
    const hardCap = target + 600; // +10 min buffer

    // Remove videos that exceed the cap (unknown durations are kept —
    // we can't filter what we can't measure, and they might be short).
    filtered = filtered.filter(
      (v) => v.durationSeconds === undefined || v.durationSeconds <= hardCap
    );

    // If filtering removed everything (all videos too long), fall back to
    // the unfiltered pool so the user is never stuck with no video.
    if (filtered.length === 0) {
      filtered = (excludeId && videos.length > 1)
        ? videos.filter((v) => v.id !== excludeId)
        : videos;
    }

    // Sort by closest duration to the user's selected time
    filtered = [...filtered].sort((a, b) => {
      const aDiff = a.durationSeconds
        ? Math.abs(a.durationSeconds - target)
        : Infinity;
      const bDiff = b.durationSeconds
        ? Math.abs(b.durationSeconds - target)
        : Infinity;
      return aDiff - bDiff;
    });

    // Take the top 40% closest matches (min 3) as the candidate pool
    const poolSize = Math.max(3, Math.ceil(filtered.length * 0.4));
    filtered = filtered.slice(0, poolSize);
  }

  // Smart weighting: liked videos get boosted
  const likedIds = getLikedVideoIds();
  if (likedIds.length > 0) {
    const weighted = filtered.flatMap((v) =>
      likedIds.includes(v.id) ? [v, v, v] : [v] // 3x weight for liked
    );
    const randomIndex = Math.floor(Math.random() * weighted.length);
    return weighted[randomIndex];
  }

  const randomIndex = Math.floor(Math.random() * filtered.length);
  return filtered[randomIndex];
}
