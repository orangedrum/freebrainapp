import { supabase, safeSupabaseQuery } from "@/lib/supabase";

export interface TeamRallyAlert {
  id: string;
  team_id?: string;
  author_id: string;
  author_name: string;
  type: 'sos' | 'rally';
  message: string;
  created_at: string;
}

/**
 * Dispatch an SOS or Team Rally alert to teammates and community.
 */
export async function dispatchTeamRally(
  userId: string,
  userName: string,
  teamId: string | null | undefined,
  type: 'sos' | 'rally',
  message: string
): Promise<TeamRallyAlert> {
  const newRally: TeamRallyAlert = {
    id: `rally_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    team_id: teamId || undefined,
    author_id: userId,
    author_name: userName,
    type,
    message,
    created_at: new Date().toISOString()
  };

  const postType = type === 'sos' ? 'sos' : 'general';
  const postContent = `${type === 'sos' ? '🆘 SOS / HARD DAY RALLY' : '🚀 TEAM RALLY'}\n\n"${message}"\n\n— Posted by ${userName}`;

  // 1. Try writing to Supabase community_posts
  try {
    await safeSupabaseQuery(() =>
      (supabase.from("community_posts") as any).insert([
        {
          user_id: userId,
          posted_by_id: userId,
          author_name: userName,
          type: postType,
          post_type: postType,
          content: postContent,
          created_at: newRally.created_at
        }
      ])
    );
  } catch (e) {
    console.warn("Supabase rally insert fallback:", e);
  }

  // 2. Persist in local storage cache for instant cross-tab / local dev reactivity
  const existingRalliesStr = localStorage.getItem("fb_active_team_rallies");
  const rallies: TeamRallyAlert[] = existingRalliesStr ? JSON.parse(existingRalliesStr) : [];
  rallies.unshift(newRally);
  localStorage.setItem("fb_active_team_rallies", JSON.stringify(rallies.slice(0, 20)));

  // Also save directly into community posts local cache so it appears on the Wall instantly
  const cachedPostsStr = localStorage.getItem("fb_community_posts_cache");
  const cachedPosts: any[] = cachedPostsStr ? JSON.parse(cachedPostsStr) : [];
  cachedPosts.unshift({
    id: newRally.id,
    user_id: userId,
    posted_by_id: userId,
    author_name: userName,
    type: postType,
    post_type: postType,
    content: postContent,
    created_at: newRally.created_at,
    cheer_count: 1
  });
  localStorage.setItem("fb_community_posts_cache", JSON.stringify(cachedPosts.slice(0, 30)));

  // 3. Dispatch custom window events for real-time local updates
  window.dispatchEvent(new CustomEvent("team_rally_dispatched", { detail: newRally }));
  window.dispatchEvent(new CustomEvent("community_post_added", { detail: newRally }));

  // 4. Push to recipients' devices (fire-and-forget — never break dispatch).
  //    Teammates always; linked caregivers too for SOS (the author is the
  //    FreeBrainer asking for help). No-op for anyone unsubscribed.
  (async () => {
    try {
      const { notifyPush, sosPush, rallyPush } = await import("./pushNotify");
      const recipientIds = new Set<string>();
      if (teamId) {
        const { data: members } = await safeSupabaseQuery<any[]>(() =>
          (supabase.from("team_members") as any).select("user_id").eq("team_id", teamId)
        );
        (Array.isArray(members) ? members : []).forEach((m: any) => {
          if (m?.user_id && m.user_id !== userId) recipientIds.add(m.user_id);
        });
      }
      if (type === "sos") {
        const { data: links } = await safeSupabaseQuery<any[]>(() =>
          (supabase.from("caregiver_links") as any).select("caregiver_id").eq("patient_id", userId)
        );
        (Array.isArray(links) ? links : []).forEach((l: any) => {
          if (l?.caregiver_id && l.caregiver_id !== userId) recipientIds.add(l.caregiver_id);
        });
      }
      if (recipientIds.size > 0) {
        await notifyPush(
          [...recipientIds],
          type === "sos" ? sosPush(userName) : rallyPush(userName)
        );
      }
    } catch (e) {
      console.warn("[FB-DEBUG] rally push skipped:", e);
    }
  })();

  return newRally;
}

/**
 * Check for active rallies today for the user's team or community.
 */
export function getActiveRalliesForUser(userId: string, teamId?: string | null): TeamRallyAlert[] {
  const existingRalliesStr = localStorage.getItem("fb_active_team_rallies");
  if (!existingRalliesStr) return [];

  try {
    const rallies: TeamRallyAlert[] = JSON.parse(existingRalliesStr);
    const todayStr = new Date().toISOString().split("T")[0];

    return rallies.filter((r) => {
      // Must be from today
      const isToday = r.created_at.startsWith(todayStr);
      // Exclude self created ones
      const isNotSelf = r.author_id !== userId;
      // Belongs to user's team or is general SOS
      const isForTeam = teamId && r.team_id ? r.team_id === teamId : true;

      return isToday && isNotSelf && isForTeam;
    });
  } catch (e) {
    return [];
  }
}
