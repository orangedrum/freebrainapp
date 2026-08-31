/**
 * postToWall — Central utility for posting activity events to the Community Wall.
 *
 * Every user activity (check-ins, boosts, joint sessions, raise standing,
 * cheers, pokes, video recommendations) should go through this function
 * so the Wall is a single source of truth for all permitted activity.
 *
 * Data tier: Tier 2 (social) — non-sensitive activity, stored in Supabase.
 *
 * Usage:
 *   await postToWall({ userId, postedById, authorName, type: 'checkin', content: '...' })
 */
import { supabase, safeSupabaseQuery } from "@/lib/supabase";
import { isDevBypassUser } from "@/lib/devBypass";

export type WallPostType =
  | "checkin"
  | "boost"
  | "joint_checkin"
  | "raise_standing"
  | "teammate_cheer"
  | "brainlover_cheer"
  | "brainlover_poke"
  | "brainlover_recommend_video"
  | "sos"
  | "rally"
  | "team_rank_change"
  | "general";

export interface PostToWallInput {
  /** The user the post is about (the FreeBrainer) */
  userId: string;
  /** Who created the post (same as userId for self-posts, BrainLover ID for caregiver posts) */
  postedById?: string;
  /** Display name for the post author */
  authorName: string;
  /** Post type — controls filtering and badge rendering */
  type: WallPostType;
  /** Post content text */
  content: string;
  /** Optional video URL */
  videoUrl?: string;
  /** Optional external link */
  externalLink?: string;
  /** Optional metadata (e.g. rank change details) */
  metadata?: Record<string, any>;
  /** If true, posts on behalf of a Pro user */
  postedAsPro?: boolean;
  /** If posting on behalf of another user, their ID */
  onBehalfOfId?: string;
}

/**
 * Post an activity event to the community_posts table.
 * Skips Supabase in dev-bypass mode (invalid UUIDs), but always
 * dispatches the local event so the Wall updates in dev mode.
 */
export async function postToWall(input: PostToWallInput): Promise<void> {
  const {
    userId,
    postedById = userId,
    authorName,
    type,
    content,
    videoUrl,
    externalLink,
    metadata,
    postedAsPro = false,
    onBehalfOfId,
  } = input;

  const now = new Date().toISOString();

  // 1. Write to Supabase (skip in dev-bypass — IDs aren't valid UUIDs)
  if (!isDevBypassUser(userId) && !isDevBypassUser(postedById)) {
    try {
      await safeSupabaseQuery(() =>
        (supabase.from("community_posts") as any).insert([
          {
            user_id: onBehalfOfId || userId,
            posted_by_id: postedById,
            author_name: authorName,
            type,
            post_type: type,
            content,
            video_url: videoUrl || null,
            external_link: externalLink || null,
            metadata: metadata || null,
            posted_as_pro: postedAsPro,
            on_behalf_of_id: onBehalfOfId || null,
            created_at: now,
          },
        ])
      );
    } catch (e) {
      console.warn("[FB-DEBUG] postToWall Supabase insert failed:", e);
    }
  }

  // 2. Cache locally for instant Wall updates (dev-bypass + offline)
  try {
    const cachedStr = localStorage.getItem("fb_community_posts_cache");
    const cached: any[] = cachedStr ? JSON.parse(cachedStr) : [];
    cached.unshift({
      id: `wall_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      user_id: onBehalfOfId || userId,
      posted_by_id: postedById,
      author_name: authorName,
      type,
      post_type: type,
      content,
      video_url: videoUrl || null,
      external_link: externalLink || null,
      metadata: metadata || null,
      posted_as_pro: postedAsPro,
      on_behalf_of_id: onBehalfOfId || null,
      created_at: now,
      cheer_count: 1,
    });
    localStorage.setItem("fb_community_posts_cache", JSON.stringify(cached.slice(0, 30)));
  } catch (e) {
    console.warn("[FB-DEBUG] postToWall localStorage cache failed:", e);
  }

  // 3. Dispatch real-time event so the Wall page updates instantly
  window.dispatchEvent(
    new CustomEvent("community_post_added", {
      detail: { type, authorName, content, created_at: now },
    })
  );
}
