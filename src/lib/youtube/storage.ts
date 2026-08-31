// ─── Storage layer: Supabase ONLY (no localStorage for playlists) ──
// Supabase is the SINGLE SOURCE OF TRUTH. localStorage is NOT used
// for playlists/videos — it caused the PLACEHOLDER_PLAYLIST_ID pollution
// loop where stale cache kept re-inserting garbage into Supabase.
// Only liked-video IDs stay in localStorage (per-device preference).
import { supabase } from "@/lib/supabase";
import {
  YouTubePlaylist,
  YouTubeSingleVideo,
} from "./types";
import {
  fetchPlaylistMetadata,
  fetchVideoMetadata,
} from "./api";

export const DEFAULT_PLAYLIST_ID = "PL68chWn4OAF_F8msHtkyWcNLXMVAaZSg3";

const DEFAULT_PLAYLISTS: YouTubePlaylist[] = [
  {
    id: DEFAULT_PLAYLIST_ID,
    title: "Daily Movement Therapy",
    description: "Official FreeBrain daily movement sessions",
    isCustom: false,
  },
];

// ONLY liked videos use localStorage (per-device, non-critical)
const LIKED_VIDEOS_KEY = "fb_liked_video_ids";

// ─── Playlist ID extraction ────────────────────────────────────

export function extractPlaylistId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const listMatch = trimmed.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  if (listMatch && listMatch[1]) return listMatch[1];
  if (/^[a-zA-Z0-9_-]{10,}$/.test(trimmed)) return trimmed;
  return null;
}

export function extractVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // youtu.be/VIDEO_ID  (also used for Shorts shares)
  const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];

  // youtube.com/watch?v=VIDEO_ID
  const watchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return watchMatch[1];

  // youtube.com/embed/VIDEO_ID
  const embedMatch = trimmed.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch) return embedMatch[1];

  // YouTube Shorts: https://youtube.com/shorts/VIDEO_ID
  // Also handles www.youtube.com, m.youtube.com, and trailing slashes/query params
  const shortsMatch = trimmed.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (shortsMatch) return shortsMatch[1];

  // youtube.com/live/VIDEO_ID
  const liveMatch = trimmed.match(/youtube\.com\/live\/([a-zA-Z0-9_-]{11})/);
  if (liveMatch) return liveMatch[1];

  // Bare 11-char video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;

  // Last-resort fallback: scan for any 11-char YouTube-style ID in the URL
  const fallbackMatch = trimmed.match(/\b([a-zA-Z0-9_-]{11})\b/);
  if (fallbackMatch) return fallbackMatch[1];

  return null;
}

// ─── Self-healing: purge polluted data from Supabase ───────────
/**
 * Deletes any playlist row with an invalid ID from Supabase.
 * YouTube playlist IDs always start with "PL". Video IDs are 11 chars.
 * Anything starting with "PLACEHOLDER_" is garbage from the old
 * localStorage merge bug. This runs on every app load so the DB
 * self-heals without requiring manual SQL runs.
 */
export async function purgeInvalidPlaylists(): Promise<void> {
  try {
    const { data, error } = await (supabase.from("playlists") as any)
      .select("id, type")
      .order("created_at");

    if (error || !data) return;

    const badIds: string[] = [];
    for (const row of data) {
      const id: string = row.id;
      // PLACEHOLDER entries from the old localStorage merge bug
      if (id.startsWith("PLACEHOLDER_")) {
        badIds.push(id);
      }
      // Playlists must start with "PL" (YouTube convention)
      if (row.type === "playlist" && !id.startsWith("PL")) {
        badIds.push(id);
      }
      // Video IDs must be exactly 11 chars
      if (row.type === "video" && id.length !== 11) {
        badIds.push(id);
      }
    }

    if (badIds.length > 0) {
      console.log("[FB-DEBUG] purgeInvalidPlaylists: deleting", badIds.length, "bad rows:", badIds);
      const { error: delError } = await (supabase.from("playlists") as any)
        .delete()
        .in("id", badIds);
      if (delError) {
        console.warn("[FB-DEBUG] purgeInvalidPlaylists: delete error:", delError.message);
      } else {
        console.log("[FB-DEBUG] purgeInvalidPlaylists: purged", badIds.length, "invalid rows OK");
      }
    } else {
      console.log("[FB-DEBUG] purgeInvalidPlaylists: no invalid rows found");
    }
  } catch (e) {
    console.warn("[FB-DEBUG] purgeInvalidPlaylists failed", e);
  }
}

// ─── Playlists: Supabase ONLY ──────────────────────────────────

/**
 * Get all playlists from Supabase (global catalog).
 * Supabase is the SINGLE SOURCE OF TRUTH. No localStorage.
 */
export async function getStoredPlaylists(): Promise<YouTubePlaylist[]> {
  try {
    const { data, error } = await (supabase.from("playlists") as any)
      .select("*")
      .eq("type", "playlist")
      .order("created_at", { ascending: true });

    if (!error && data) {
      const playlists: YouTubePlaylist[] = data.map((row: any) => ({
        id: row.id,
        title: row.title,
        description: row.description || "",
        isCustom: row.created_by !== null,
        isGlobalDefault: row.is_global_default,
      }));
      console.log("[FB-DEBUG] getStoredPlaylists: Supabase returned", playlists.length, "playlists");
      return playlists.length > 0 ? playlists : DEFAULT_PLAYLISTS;
    }
  } catch (e) {
    console.warn("Supabase playlists fetch failed", e);
  }
  return DEFAULT_PLAYLISTS;
}

/** Synchronous stub — no localStorage, return defaults for instant UI */
export function getCachedPlaylists(): YouTubePlaylist[] {
  return DEFAULT_PLAYLISTS;
}

// ─── Active playlist IDs (Supabase ONLY) ────────────────────────

export async function getActivePlaylistIds(): Promise<string[]> {
  try {
    const { data, error } = await (supabase.from("playlists") as any)
      .select("id")
      .eq("type", "playlist")
      .eq("is_active", true);

    console.log("[FB-DEBUG] getActivePlaylistIds: query all active playlists:", { error, rowCount: data?.length, data });

    if (!error && data && data.length > 0) {
      const ids = data.map((row: any) => row.id);
      console.log("[FB-DEBUG] Returning all active playlist IDs:", ids);
      return ids;
    }
  } catch (e) {
    console.warn("[FB-DEBUG] Supabase active playlists fetch failed", e);
  }

  console.log("[FB-DEBUG] Returning DEFAULT_PLAYLIST_ID (last resort):", [DEFAULT_PLAYLIST_ID]);
  return [DEFAULT_PLAYLIST_ID];
}

/** Synchronous stub — no localStorage */
export function getCachedActivePlaylistIds(): string[] {
  return [DEFAULT_PLAYLIST_ID];
}

export async function setActivePlaylistIds(ids: string[]): Promise<void> {
  // ── Source of truth: toggle is_active on the playlists table directly.
  try {
    // Deactivate all playlist-type rows not in the selected set
    const { data: deactivated, error: deactivateError } = await (supabase.from("playlists") as any)
      .update({ is_active: false })
      .eq("type", "playlist")
      .not("id", "in", `(${ids.length > 0 ? ids.map((id) => `'${id}'`).join(",") : "''"})`)
      .select("id");

    if (deactivateError) {
      console.warn("[FB-DEBUG] setActivePlaylistIds: deactivate error:", deactivateError.message);
    }

    // Activate the selected ones
    let activatedCount = 0;
    if (ids.length > 0) {
      const { data: activated, error: activateError } = await (supabase.from("playlists") as any)
        .update({ is_active: true })
        .eq("type", "playlist")
        .in("id", ids)
        .select("id");

      if (activateError) {
        console.warn("[FB-DEBUG] setActivePlaylistIds: activate error:", activateError.message);
      } else {
        activatedCount = activated?.length || 0;
      }
    }

    if (ids.length > 0 && activatedCount < ids.length) {
      console.error(
        `[FB-DEBUG] ⚠️ RLS SILENT FAILURE: Tried to activate ${ids.length} playlists but only ${activatedCount} succeeded. ` +
        `Run supabase/migrations/07_fix_admin_rls.sql to add the admin role to user_roles.`
      );
    } else {
      console.log(`[FB-DEBUG] setActivePlaylistIds: activated ${activatedCount}/${ids.length} playlists OK`);
    }
  } catch (e) {
    console.warn("[FB-DEBUG] Failed to persist playlist active state to Supabase", e);
  }
}

// ─── Admin global defaults (Supabase-backed) ──────────────────

export async function getGlobalDefaultPlaylistIds(): Promise<string[]> {
  try {
    const { data, error } = await (supabase.from("playlists") as any)
      .select("id")
      .eq("is_global_default", true)
      .eq("is_active", true)
      .eq("type", "playlist");

    console.log("[FB-DEBUG] getGlobalDefaultPlaylistIds query:", { error, rowCount: data?.length, data });

    if (!error && data && data.length > 0) {
      const ids = data.map((row: any) => row.id);
      return ids;
    }
  } catch (e) {
    console.warn("[FB-DEBUG] Supabase global defaults fetch failed", e);
  }
  return [];
}

/** Fetch global default single-video IDs from Supabase (type = 'video'). */
export async function getGlobalDefaultVideoIds(): Promise<string[]> {
  try {
    const { data, error } = await (supabase.from("playlists") as any)
      .select("id")
      .eq("is_global_default", true)
      .eq("is_active", true)
      .eq("type", "video");

    if (!error && data && data.length > 0) {
      return data.map((row: any) => row.id);
    }
  } catch (e) {
    console.warn("Supabase global default videos fetch failed", e);
  }
  return [];
}

export async function setGlobalDefaultPlaylistIds(ids: string[]): Promise<void> {
  // Update Supabase directly — no localStorage
  try {
    // Clear all global defaults
    const clearResult = await (supabase.from("playlists") as any)
      .update({ is_global_default: false })
      .neq("id", "___never___");
    console.log("[FB-DEBUG] setGlobalDefaultPlaylistIds: clear all result:", { error: clearResult.error, status: clearResult.status });

    // Set selected as global defaults
    if (ids.length > 0) {
      const setResult = await (supabase.from("playlists") as any)
        .update({ is_global_default: true })
        .in("id", ids);
      console.log("[FB-DEBUG] setGlobalDefaultPlaylistIds: set selected result:", { ids, error: setResult.error, status: setResult.status });
    }
  } catch (e) {
    console.warn("[FB-DEBUG] Failed to persist global defaults to Supabase", e);
  }
}

export async function toggleGlobalDefault(playlistId: string): Promise<string[]> {
  const current = await getGlobalDefaultPlaylistIds();
  const updated = current.includes(playlistId)
    ? current.filter((id) => id !== playlistId)
    : [...current, playlistId];
  await setGlobalDefaultPlaylistIds(updated);
  return updated;
}

// ─── Backward-compat single-active (delegates to multi) ─────────

export async function getActivePlaylistId(): Promise<string> {
  const ids = await getActivePlaylistIds();
  return ids[0] || DEFAULT_PLAYLIST_ID;
}

export async function setActivePlaylistId(playlistId: string): Promise<void> {
  await setActivePlaylistIds([playlistId]);
}

// ─── Add / remove playlists (writes to Supabase) ──────────────

export async function addYouTubePlaylist(
  inputUrlOrId: string,
  customTitle?: string
): Promise<YouTubePlaylist> {
  const playlistId = extractPlaylistId(inputUrlOrId);
  if (!playlistId) {
    throw new Error("Invalid YouTube Playlist URL or Playlist ID");
  }

  const meta = await fetchPlaylistMetadata(playlistId);
  let title = customTitle || meta.title;
  let description = meta.description;

  // Check if already exists in Supabase
  const { data: existing } = await (supabase.from("playlists") as any)
    .select("*")
    .eq("id", playlistId)
    .maybeSingle();

  if (existing) {
    return {
      id: existing.id,
      title: existing.title,
      description: existing.description || "",
      isCustom: true,
      isGlobalDefault: existing.is_global_default,
    };
  }

  // Insert into Supabase
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Auto-mark as global default so all users see it immediately
  const { error } = await (supabase.from("playlists") as any).insert({
    id: playlistId,
    title,
    description: description.slice(0, 120),
    type: "playlist",
    is_global_default: true,
    is_active: true,
    created_by: user?.id || null,
  });

  console.log("[FB-DEBUG] addYouTubePlaylist insert result:", { playlistId, error: error ? { code: error.code, message: error.message } : null });

  if (error) {
    console.error("[FB-DEBUG] addYouTubePlaylist FAILED:", error.code, error.message);
    throw new Error(`Failed to save playlist: ${error.message}. Make sure your admin role is set in user_roles.`);
  }

  // Clear in-memory video cache so the new playlist is fetched fresh
  const { clearPlaylistVideoCache } = await import("./selection");
  clearPlaylistVideoCache();

  return {
    id: playlistId,
    title,
    description: description.slice(0, 120),
    isCustom: true,
    isGlobalDefault: true,
  };
}

/**
 * Force-sync is now a NO-OP. Supabase is the single source of truth.
 * Kept for backward compat with the PlaylistManager UI button.
 * Just clears the video cache and returns an empty report.
 */
export async function forceSyncAllPlaylistsToSupabase(): Promise<{
  synced: string[];
  failed: { id: string; error: string }[];
}> {
  console.log("[FB-DEBUG] forceSync: Supabase is source of truth — no localStorage sync needed. Clearing video cache.");
  const { clearPlaylistVideoCache } = await import("./selection");
  clearPlaylistVideoCache();
  return { synced: [], failed: [] };
}

export async function removeYouTubePlaylist(playlistId: string): Promise<void> {
  // Remove from Supabase (admin only via RLS, but try)
  try {
    await (supabase.from("playlists") as any)
      .delete()
      .eq("id", playlistId);
  } catch (e) {
    console.warn("Failed to delete playlist from Supabase", e);
  }

  // Clear in-memory video cache so the removed playlist is purged
  const { clearPlaylistVideoCache } = await import("./selection");
  clearPlaylistVideoCache();

  // Remove from global defaults
  const globals = (await getGlobalDefaultPlaylistIds()).filter(
    (id) => id !== playlistId
  );
  await setGlobalDefaultPlaylistIds(globals);
}

// ─── Individual video storage (Supabase-backed) ───────────────

export async function getStoredSingleVideos(): Promise<YouTubeSingleVideo[]> {
  try {
    const { data, error } = await (supabase.from("playlists") as any)
      .select("*")
      .eq("type", "video")
      .order("created_at", { ascending: true });

    if (!error && data && data.length > 0) {
      return data.map((row: any) => ({
        id: row.id,
        title: row.title,
        description: row.description || "",
        thumbnail: row.thumbnail || "",
        isCustom: true,
      }));
    }
  } catch (e) {
    console.warn("Supabase single videos fetch failed", e);
  }
  return [];
}

export async function getActiveSingleVideoIds(): Promise<string[]> {
  try {
    const { data, error } = await (supabase.from("playlists") as any)
      .select("id")
      .eq("type", "video")
      .eq("is_active", true);

    if (!error && data && data.length > 0) {
      const ids = data.map((row: any) => row.id);
      console.log("[FB-DEBUG] getActiveSingleVideoIds: returning", ids);
      return ids;
    }
  } catch (e) {
    console.warn("[FB-DEBUG] Supabase active single videos fetch failed", e);
  }
  return [];
}

export async function toggleActiveSingleVideo(videoId: string): Promise<string[]> {
  const current = await getActiveSingleVideoIds();
  const updated = current.includes(videoId)
    ? current.filter((id) => id !== videoId)
    : [...current, videoId];

  // ── Source of truth: toggle is_active on the playlists table directly.
  try {
    const isActive = current.includes(videoId) ? false : true;
    const { data: updatedRows, error } = await (supabase.from("playlists") as any)
      .update({ is_active: isActive })
      .eq("id", videoId)
      .eq("type", "video")
      .select("id");
    if (error) {
      console.warn("[FB-DEBUG] toggleActiveSingleVideo: error:", error.message);
    } else if (!updatedRows || updatedRows.length === 0) {
      console.error(
        `[FB-DEBUG] ⚠️ RLS SILENT FAILURE: toggleActiveSingleVideo for ${videoId} affected 0 rows. ` +
        `Run supabase/migrations/07_fix_admin_rls.sql to add the admin role to user_roles.`
      );
    } else {
      console.log(`[FB-DEBUG] toggleActiveSingleVideo: ${videoId} → is_active=${isActive} OK`);
    }
  } catch (e) {
    console.warn("[FB-DEBUG] Failed to persist single video toggle to Supabase", e);
  }

  return updated;
}

export async function addYouTubeVideo(
  inputUrlOrId: string,
  customTitle?: string
): Promise<YouTubeSingleVideo> {
  const videoId = extractVideoId(inputUrlOrId);
  if (!videoId) {
    throw new Error("Invalid YouTube Video URL or Video ID");
  }

  const meta = await fetchVideoMetadata(videoId);
  let title = customTitle || meta.title;
  let description = meta.description;
  let thumbnail = meta.thumbnail;

  // Check if already exists
  const { data: existing } = await (supabase.from("playlists") as any)
    .select("*")
    .eq("id", videoId)
    .maybeSingle();

  if (existing) {
    return {
      id: existing.id,
      title: existing.title,
      description: existing.description || "",
      thumbnail: existing.thumbnail || "",
      isCustom: true,
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await (supabase.from("playlists") as any).insert({
    id: videoId,
    title,
    description: description || "",
    type: "video",
    thumbnail,
    is_global_default: true,
    is_active: true,
    created_by: user?.id || null,
  });

  console.log("[FB-DEBUG] addYouTubeVideo insert result:", { videoId, error: error ? { code: error.code, message: error.message } : null });

  if (error) {
    console.error("[FB-DEBUG] addYouTubeVideo FAILED:", error.code, error.message);
    throw new Error(`Failed to save video: ${error.message}. Make sure your admin role is set in user_roles.`);
  }

  // Clear in-memory video cache so the new video is fetched fresh
  const { clearPlaylistVideoCache } = await import("./selection");
  clearPlaylistVideoCache();

  return {
    id: videoId,
    title,
    description: description || undefined,
    thumbnail,
    isCustom: true,
  };
}

export async function removeYouTubeVideo(videoId: string): Promise<void> {
  try {
    await (supabase.from("playlists") as any)
      .delete()
      .eq("id", videoId)
      .eq("type", "video");
  } catch (e) {
    console.warn("Failed to delete video from Supabase", e);
  }
}

/** Synchronous stub — no localStorage */
export function getCachedSingleVideos(): YouTubeSingleVideo[] {
  return [];
}

// ─── Smart liking (localStorage-only, per-device) ──────────────

export function getLikedVideoIds(): string[] {
  try {
    const raw = localStorage.getItem(LIKED_VIDEOS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [];
}

export function likeVideo(videoId: string): void {
  const liked = getLikedVideoIds();
  if (!liked.includes(videoId)) {
    localStorage.setItem(LIKED_VIDEOS_KEY, JSON.stringify([...liked, videoId]));
  }
}

export function unlikeVideo(videoId: string): void {
  const liked = getLikedVideoIds().filter((id) => id !== videoId);
  localStorage.setItem(LIKED_VIDEOS_KEY, JSON.stringify(liked));
}

export function isVideoLiked(videoId: string): boolean {
  return getLikedVideoIds().includes(videoId);
}
