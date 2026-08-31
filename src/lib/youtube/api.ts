// ─── YouTube Data API calls (fetch, parse, filter) ────────────
import { YouTubeVideo, YouTubeSingleVideo } from "./types";

export const API_KEY = "AIzaSyBGYin_i78FDpjNvLHOkn9P5UtG95je2og";

/**
 * Detect vertical video orientation from YouTube thumbnail metadata.
 *
 * Heuristic: YouTube provides a `default` thumbnail (120x120 square) for
 * ALL videos. The `medium` thumbnail (320x180) is only provided for
 * horizontal (16:9) videos. If `medium` is absent but `default` exists,
 * the video is vertical (9:16).
 *
 * This is more reliable than checking `maxres` (many videos lack it).
 */
export function detectVerticalOrientation(thumbs: any): boolean {
  if (!thumbs) return false;
  const medium = thumbs.medium;
  // If medium exists and is wider than tall → horizontal
  if (medium && medium.width && medium.height) {
    return medium.height > medium.width;
  }
  // If medium is absent but default exists → likely vertical
  if (!medium && thumbs.default) {
    return true;
  }
  // Fallback: check maxres if available
  const maxres = thumbs.maxres;
  if (maxres && maxres.width && maxres.height) {
    return maxres.height > maxres.width;
  }
  return false;
}

/** Parse ISO 8601 duration (PT5M30S) to seconds */
export function parseDuration(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  const h = parseInt(m[1] || "0", 10);
  const min = parseInt(m[2] || "0", 10);
  const s = parseInt(m[3] || "0", 10);
  return h * 3600 + min * 60 + s;
}

/** Fetch video details including duration via YouTube Data API */
export async function fetchVideoDetails(
  videoId: string
): Promise<{ durationSeconds: number; isVertical: boolean }> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${videoId}&key=${API_KEY}`
    );
    if (!res.ok) return { durationSeconds: 0, isVertical: false };
    const data = await res.json();
    if (data.items && data.items.length > 0) {
      const item = data.items[0];
      const durationSeconds = parseDuration(item.contentDetails?.duration || "PT0S");
      const thumbs = item.snippet?.thumbnails || {};
      const isVertical = detectVerticalOrientation(thumbs);
      return { durationSeconds, isVertical };
    }
  } catch (e) {
    console.warn("Failed to fetch video details", e);
  }
  return { durationSeconds: 0, isVertical: false };
}

/** Fetch playlist metadata from YouTube API */
export async function fetchPlaylistMetadata(playlistId: string): Promise<{
  title: string;
  description: string;
}> {
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${playlistId}&key=${API_KEY}`
  );
  if (!res.ok) {
    throw new Error(`YouTube API returned status ${res.status}`);
  }
  const data = await res.json();
  if (data.items && data.items.length > 0) {
    return {
      title: data.items[0].snippet?.title || "YouTube Playlist",
      description: data.items[0].snippet?.description || "",
    };
  }
  return { title: "YouTube Playlist", description: "" };
}

/** Fetch video metadata (title, description, thumbnail) from YouTube API */
export async function fetchVideoMetadata(videoId: string): Promise<{
  title: string;
  description: string;
  thumbnail: string;
}> {
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${API_KEY}`
  );
  if (!res.ok) return { title: "YouTube Video", description: "", thumbnail: "" };
  const data = await res.json();
  if (data.items && data.items.length > 0) {
    const sn = data.items[0].snippet;
    return {
      title: sn?.title || "YouTube Video",
      description: (sn?.description || "").slice(0, 160),
      thumbnail:
        sn?.thumbnails?.high?.url ||
        sn?.thumbnails?.medium?.url ||
        sn?.thumbnails?.default?.url ||
        "",
    };
  }
  return { title: "YouTube Video", description: "", thumbnail: "" };
}

/** Fetch all videos from a single playlist, with duration + embeddability filtering */
export async function fetchSinglePlaylistVideos(
  playlistId: string
): Promise<YouTubeVideo[]> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&key=${API_KEY}`
    );
    if (!res.ok) throw new Error(`YouTube API returned ${res.status}`);
    const data = await res.json();

    if (data.items && data.items.length > 0) {
      const items: YouTubeVideo[] = data.items
        .filter(
          (item: any) =>
            item.snippet?.resourceId?.videoId &&
            item.snippet?.title !== "Private video" &&
            item.snippet?.title !== "Deleted video"
        )
        .map((item: any) => {
          const videoId = item.snippet.resourceId.videoId;
          return {
            id: videoId,
            title: item.snippet.title || "Movement Session",
            description: item.snippet.description
              ? item.snippet.description.slice(0, 160) +
                (item.snippet.description.length > 160 ? "..." : "")
              : "Guided movement for your daily check-in.",
            thumbnail:
              item.snippet.thumbnails?.high?.url ||
              item.snippet.thumbnails?.default?.url ||
              "",
            embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`,
            playlistId,
          };
        });

      if (items.length > 0) {
        // Fetch durations + embeddability + status for all videos in parallel
        const videoIds = items.map((v) => v.id);
        try {
          const detailsRes = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet,status&id=${videoIds.join(",")}&key=${API_KEY}`
          );
          if (detailsRes.ok) {
            const detailsData = await detailsRes.json();
            if (detailsData.items) {
              const validIds = new Set<string>();
              const detailsMap = new Map<
                string,
                { durationSeconds: number; isVertical: boolean }
              >();
              for (const item of detailsData.items) {
                const status = item.status;
                const isEmbeddable = status?.embeddable !== false;
                const isPublic =
                  status?.privacyStatus === "public" ||
                  status?.privacyStatus === "unlisted";
                const isProcessed = status?.uploadStatus === "processed";
                const notRejected = !status?.rejectionReason;

                if (isEmbeddable && (isPublic || isProcessed) && notRejected) {
                  validIds.add(item.id);
                }

                const durationSeconds = parseDuration(
                  item.contentDetails?.duration || "PT0S"
                );
                const thumbs = item.snippet?.thumbnails || {};
                const isVertical = detectVerticalOrientation(thumbs);
                detailsMap.set(item.id, { durationSeconds, isVertical });
              }

              // Filter out blocked/unavailable videos
              const filteredItems = items.filter((v) => validIds.has(v.id));

              // Apply duration + orientation to surviving videos
              for (const vid of filteredItems) {
                const d = detailsMap.get(vid.id);
                if (d) {
                  vid.durationSeconds = d.durationSeconds;
                  vid.isVertical = d.isVertical;
                }
              }

              // Use filtered list if any survived; otherwise keep originals as fallback
              const finalItems =
                filteredItems.length > 0 ? filteredItems : items;
              return finalItems;
            }
          }
        } catch (e) {
          console.warn("Failed to fetch video durations/status", e);
        }
      }

      return items;
    }
  } catch (err) {
    console.warn("Error fetching YouTube playlist, using fallback:", err);
  }

  return [
    {
      id: "TOA1nyG7DSc",
      title: "Daily Brain Movement Therapy",
      description: "Guided movement session from your playlist.",
      thumbnail: "",
      embedUrl: "https://www.youtube.com/embed/TOA1nyG7DSc?autoplay=1&rel=0",
      playlistId,
    },
  ];
}

/** Fallback video for single-video entries */
export async function getSingleVideoYouTubeVideo(videoId: string): Promise<YouTubeVideo> {
  // Fetch details so we get duration + orientation
  const { durationSeconds, isVertical } = await fetchVideoDetails(videoId);
  return {
    id: videoId,
    title: "Custom Movement Video",
    description: "Admin-added movement video.",
    thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`,
    durationSeconds,
    isVertical,
  };
}
