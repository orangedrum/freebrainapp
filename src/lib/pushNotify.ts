/**
 * pushNotify — client-side fan-out for Web Push (v1).
 *
 * Called right AFTER an event is durably stored (community post, invite row,
 * etc.). Resolves delivery to "whoever subscribed": send-push no-ops for
 * users with no subscription row, so no recipient preference lookup is
 * needed — the subscription row IS the opt-in.
 *
 * Rules: fire-and-forget (never break the send flow), health-free copy only
 * (names + generic nudges — never symptoms or clinical content), deep link
 * every tap. No badge here (reserved for action-needed nudges in step 3).
 * NOTE: copy is English-only for v1; localized push needs recipient locale
 * (profiles.locale) applied inside the send-push function — future work.
 * NOTE: send-push currently accepts any authenticated caller; add JWT role
 * checks + rate limiting before public launch.
 */
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase";

export interface PushContent {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

function isPushableId(id: string | null | undefined): id is string {
  return !!id && !id.startsWith("dev-") && !id.startsWith("test-");
}

export async function notifyPush(userIds: (string | null | undefined)[], content: PushContent): Promise<void> {
  const targets = [...new Set(userIds.filter(isPushableId))];
  if (targets.length === 0) return;
  try {
    // Direct fetch (NOT supabase.functions.invoke): invoke-shaped requests
    // were dying headerless at the gateway (400, no CORS headers, no
    // execution) while identical manual fetches got proper responses.
    // Mirror the proven shape: apikey + live user JWT, plain JSON body.
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      console.warn("[FB-DEBUG] notifyPush skipped: no session (push needs a signed-in sender).");
      return;
    }
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        user_ids: targets,
        title: content.title,
        body: content.body.slice(0, 120),
        url: content.url || "/support",
        tag: content.tag,
      }),
    });
    const text = await res.text().catch(() => "");
    if (!res.ok) {
      console.warn(`[FB-DEBUG] notifyPush invoke failed (non-fatal): HTTP ${res.status} ${text.slice(0, 200)}`);
    } else {
      try {
        const data = JSON.parse(text);
        console.log("[FB-DEBUG] notifyPush delivered:", JSON.stringify({ to: targets.length, sent: data?.sent ?? null, pruned: data?.pruned ?? null, failed: data?.failed ?? null, tag: content.tag }));
      } catch {
        console.log("[FB-DEBUG] notifyPush delivered (unparsed response).");
      }
    }
  } catch (e) {
    console.warn("[FB-DEBUG] notifyPush error (non-fatal):", e);
  }
}

/** Copy builders — sender-agnostic (any role encourages any role). */
export function cheerPush(senderName: string, kind: "cheer" | "poke" | "recommend_video" | "teammate_cheer"): PushContent {
  const name = senderName || "Someone";
  if (kind === "poke") {
    return { title: "FreeBrain", body: `👋 ${name} nudged you — your brain is waiting for movement!`, url: "/support", tag: "poke" };
  }
  if (kind === "recommend_video") {
    return { title: "FreeBrain", body: `🎬 ${name} picked a video for you — tap to move together!`, url: "/support", tag: "video" };
  }
  if (kind === "teammate_cheer") {
    return { title: "FreeBrain", body: `❤️ ${name} (teammate) sent you a cheer!`, url: "/support", tag: "cheer" };
  }
  return { title: "FreeBrain", body: `💪 ${name} cheered you on — time to move!`, url: "/support", tag: "cheer" };
}

export function sosPush(authorName: string): PushContent {
  const name = authorName || "Someone";
  return { title: "FreeBrain", body: `🆘 ${name} needs support — open FreeBrain to rally them!`, url: "/community", tag: "sos" };
}

export function rallyPush(authorName: string): PushContent {
  const name = authorName || "Someone";
  return { title: "FreeBrain", body: `🚀 ${name} rallied the team to move!`, url: "/community", tag: "rally" };
}
