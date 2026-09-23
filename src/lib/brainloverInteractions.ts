import { supabase, safeSupabaseQuery } from "@/lib/supabase";
import { isDevBypassUser } from "@/lib/devBypass";

export interface BrainLoverInteraction {
  id: string;
  patient_id: string;
  sender_id: string;
  sender_name: string;
  type: 'poke' | 'recommend_video' | 'cheer';
  title: string;
  message: string;
  video?: {
    id: string;
    title: string;
    description?: string;
    embedUrl?: string;
    thumbnail?: string;
  };
  customMessage?: string;
  created_at: string;
  dismissed?: boolean;
}

/**
 * Dispatch a BrainLover interaction (Poke, Video Recommendation, Cheer) to Supabase & Storage
 */
export async function sendBrainLoverInteraction(
  patientId: string,
  senderId: string,
  senderName: string,
  type: 'poke' | 'recommend_video' | 'cheer',
  details?: {
    video?: any;
    customMessage?: string;
  }
): Promise<BrainLoverInteraction> {
  const now = new Date().toISOString();
  let title = "Your BrainLover sent you a cheer!";
  let message = `${senderName} is cheering you on today!`;

  if (type === 'poke') {
    title = "Your BrainLover Reminded You to Move!";
    message = `${senderName} sent a friendly reminder to get moving today!`;
  } else if (type === 'recommend_video') {
    title = `Video Recommended by ${senderName}`;
    message = details?.customMessage
      ? details.customMessage
      : details?.video?.title
        ? `Try "${details.video.title}" picked specially for you.`
        : `${senderName} recommended a movement video for you!`;
  } else if (type === 'cheer') {
    title = "Your BrainLover Cheered for You!";
    message = details?.customMessage || `${senderName} sent encouragement for your movement journey!`;
  }

  const interaction: BrainLoverInteraction = {
    id: `bl_act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    patient_id: patientId,
    sender_id: senderId,
    sender_name: senderName,
    type,
    title,
    message,
    video: details?.video,
    customMessage: details?.customMessage,
    created_at: now,
    dismissed: false,
  };

  // 1. Write to Supabase community_posts as a high-visibility cheer post
  //    Skip in dev-bypass mode — IDs are not valid UUIDs.
  //    Capture the Supabase id so the local list item and the DB row
  //    share the SAME id — otherwise dismiss/fetch dedup can't match.
  let supabaseId: string | null = null;
  if (!isDevBypassUser(patientId) && !isDevBypassUser(senderId)) {
    try {
      const postContent = `❤️ ${title}\n"${message}"\n— ${senderName}`;
      const { data: inserted } = await safeSupabaseQuery<{ id: string }>(() =>
        (supabase.from("community_posts") as any)
          .insert([
            {
              user_id: patientId,
              posted_by_id: senderId,
              author_name: senderName,
              type: `brainlover_${type}`,
              post_type: `brainlover_${type}`,
              content: postContent,
              created_at: now,
            },
          ])
          .select("id")
          .single()
      );
      if (inserted?.id) { supabaseId = inserted.id; }
    } catch (e) {
      console.warn("Supabase interaction insert fallback:", e);
    }
  }

  // 1b. Use the Supabase post id for the local list item so dismiss
  //     and fetch share the same id (they currently differ: bl_act_... vs uuid).
  if (supabaseId) {
    interaction.id = supabaseId;
  }

  // 2. Persist in local storage keys for multi-key backup
  try {
    // Legacy keys for backward compatibility
    if (type === 'poke') {
      localStorage.setItem(`fb_poke_${patientId}`, JSON.stringify({ pokedAt: now, pokedBy: senderName }));
    } else if (type === 'recommend_video' && details?.video) {
      localStorage.setItem(
        `fb_recommended_video_${patientId}`,
        JSON.stringify({ video: details.video, recommendedBy: senderName, timestamp: now, customMessage: details.customMessage })
      );
    } else if (type === 'cheer') {
      const todayStr = now.split('T')[0];
      const existing = localStorage.getItem(`fb_encouraged_${patientId}_${todayStr}`);
      let count = 1;
      if (existing) {
        try { count = (JSON.parse(existing).count || 0) + 1; } catch (e) {}
      }
      localStorage.setItem(`fb_encouraged_${patientId}_${todayStr}`, JSON.stringify({ count, timestamp: now }));
    }

    // Unified list storage
    const listKey = `fb_brainlover_interactions_${patientId}`;
    const existingListStr = localStorage.getItem(listKey);
    const list: BrainLoverInteraction[] = existingListStr ? JSON.parse(existingListStr) : [];
    list.unshift(interaction);
    localStorage.setItem(listKey, JSON.stringify(list.slice(0, 15)));
  } catch (e) {
    console.warn("Local storage save error:", e);
  }

  // 3. Dispatch real-time window event
  window.dispatchEvent(new CustomEvent("brainlover_interaction_sent", { detail: interaction }));

  return interaction;
}

/**
 * Fetch all active/un-dismissed BrainLover interactions for a FreeBrainer
 */
export async function fetchBrainLoverInteractions(patientId: string): Promise<BrainLoverInteraction[]> {
  const interactions: BrainLoverInteraction[] = [];

  // 1. Load from unified local storage cache first (ALL items,
  //    including dismissed, so we can dedup Supabase posts against
  //    them and keep dismissed items from re-appearing on reload).
  let allParsed: BrainLoverInteraction[] = [];
  try {
    const listKey = `fb_brainlover_interactions_${patientId}`;
    const existingListStr = localStorage.getItem(listKey);
    if (existingListStr) {
      allParsed = JSON.parse(existingListStr);
      // Display: non-dismissed local items only
      interactions.push(...allParsed.filter((item) => !item.dismissed));
    }
  } catch (e) {}

  // Build a set of dismissed local ids for Supabase dedup
  const dismissedIds = new Set(allParsed.filter((item) => item.dismissed).map((item) => item.id));

  // 2. Check legacy storage keys if unified list was empty
  if (interactions.length === 0) {
    try {
      const pokeStr = localStorage.getItem(`fb_poke_${patientId}`);
      if (pokeStr) {
        const poke = JSON.parse(pokeStr);
        interactions.push({
          id: `legacy_poke_${Date.now()}`,
          patient_id: patientId,
          sender_id: "",
          sender_name: poke.pokedBy || "Your BrainLover",
          type: "poke",
          title: "Your BrainLover Reminded You to Move!",
          message: `${poke.pokedBy || "Your BrainLover"} sent a reminder to get moving today!`,
          created_at: poke.pokedAt || new Date().toISOString(),
        });
      }

      const recStr = localStorage.getItem(`fb_recommended_video_${patientId}`);
      if (recStr) {
        const rec = JSON.parse(recStr);
        interactions.push({
          id: `legacy_rec_${Date.now()}`,
          patient_id: patientId,
          sender_id: "",
          sender_name: rec.recommendedBy || "Your BrainLover",
          type: "recommend_video",
          title: `Video Recommended by ${rec.recommendedBy || "BrainLover"}`,
          message: rec.customMessage || rec.video?.title || "Recommended video for you!",
          video: rec.video,
          customMessage: rec.customMessage,
          created_at: rec.timestamp || new Date().toISOString(),
        });
      }
    } catch (e) {}
  }

  // 3. Query Supabase community_posts for recent brainlover posts within last 48 hours
  //    Skip in dev-bypass mode — dev-user-id is not a valid UUID.
  //    Acknowledged (dismissed) rows are excluded server-side; the local
  //    dismissedIds set below covers same-session races.
  if (!isDevBypassUser(patientId)) {
    try {
      const { data: posts } = await safeSupabaseQuery<any>(() =>
        (supabase.from("community_posts") as any)
          .select("*")
          .eq("user_id", patientId)
          .ilike("type", "brainlover_%")
          .is("acknowledged_at", null)
          .order("created_at", { ascending: false })
          .limit(5)
      );

        if (posts && Array.isArray(posts)) {
          posts.forEach((p) => {
            // Skip acknowledged rows (belt-and-suspenders alongside the
            // server-side filter) and locally dismissed ids.
            if (p.acknowledged_at) return;
            if (dismissedIds.has(p.id)) return;
            const typeStr = (p.type || "").replace("brainlover_", "") as 'poke' | 'recommend_video' | 'cheer';
            // Dedup by id only — local list items now carry the
            // Supabase id (see sendBrainLoverInteraction 1b), so
            // dismissed items stay dismissed instead of re-appearing.
            const exists = interactions.some((item) => item.id === p.id);
            if (!exists) {
              interactions.push({
                id: p.id,
                patient_id: patientId,
                sender_id: p.posted_by_id || "",
                sender_name: p.author_name || "Your BrainLover",
                type: typeStr || "cheer",
                title: p.content?.split("\n")[0] || "Interaction from BrainLover",
                message: p.content || "Cheered for you!",
                created_at: p.created_at || new Date().toISOString(),
              });
            }
          });
        }
      } catch (e) {}
    }

  return interactions;
}

/**
 * Send a one-tap cheer from one FreeBrainer to a teammate.
 * Posts to community_posts with type "teammate_cheer" so it shows up
 * on the teammate's Love page without being mislabeled as a BrainLover interaction.
 *
 * Data tier: Tier 2 (social) — non-sensitive encouragement, stored in Supabase.
 */
export async function sendTeammateCheer(
  senderId: string,
  senderName: string,
  recipientId: string
): Promise<void> {
  const now = new Date().toISOString();

  // Skip Supabase insert in dev-bypass mode — IDs are not valid UUIDs
  if (!isDevBypassUser(senderId) && !isDevBypassUser(recipientId)) {
    try {
      await safeSupabaseQuery(() =>
        (supabase.from("community_posts") as any).insert([
          {
            user_id: recipientId,
            posted_by_id: senderId,
            author_name: senderName,
            type: "teammate_cheer",
            post_type: "teammate_cheer",
            content: `❤️ ${senderName} sent you a cheer!`,
            created_at: now,
          },
        ])
      );
    } catch (e) {
      console.warn("[FB-DEBUG] sendTeammateCheer error:", e);
    }
  }

  // Dispatch real-time event so the recipient's Love page updates
  window.dispatchEvent(
    new CustomEvent("brainlover_interaction_sent", {
      detail: { type: "teammate_cheer", recipientId },
    })
  );
}

/**
 * Dismiss a BrainLover interaction
 */
export function dismissBrainLoverInteraction(patientId: string, interactionId: string, type?: string) {
  try {
    // Clear legacy keys if applicable
    if (type === 'poke') localStorage.removeItem(`fb_poke_${patientId}`);
    if (type === 'recommend_video') localStorage.removeItem(`fb_recommended_video_${patientId}`);

    // Server-side acknowledgement (migration 52) — the ONLY dismiss that
    // survives reload on the recipient's device. The old code marked only
    // the sender's browser list, making recipient dismisses a silent no-op.
    // Fire-and-forget: callers already hide the item optimistically.
    (async () => {
      try {
        const { supabase, safeSupabaseQuery } = await import("@/lib/supabase");
        const { error } = await safeSupabaseQuery(() =>
          (supabase.from("community_posts") as any)
            .update({ acknowledged_at: new Date().toISOString() })
            .eq("id", interactionId)
            .eq("user_id", patientId)
            .is("acknowledged_at", null)
        );
        if (error) {
          console.warn("[FB-DEBUG] dismissBrainLoverInteraction server ack failed (will reappear on reload):", error);
        }
      } catch (e) {
        console.warn("[FB-DEBUG] dismissBrainLoverInteraction server ack error:", e);
      }
    })();

    // Update unified list (same-device instant + legacy senders)
    const listKey = `fb_brainlover_interactions_${patientId}`;
    const existingListStr = localStorage.getItem(listKey);
    if (existingListStr) {
      const list: BrainLoverInteraction[] = JSON.parse(existingListStr);
      const updated = list.map((item) => (item.id === interactionId ? { ...item, dismissed: true } : item));
      localStorage.setItem(listKey, JSON.stringify(updated));
    }
  } catch (e) {}
}
