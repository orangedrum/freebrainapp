/**
 * useBrainLoverUpdates — fetches a unified chronological timeline for
 * the BrainLover's selected FreeBrainer (or ALL FreeBrainers if allPatients
 * is provided).
 *
 * Sources (merged into one descending-by-date list):
 *  1. daily_checkins          — check-in events (moved, rested, tested)
 *  2. brainlover_interactions — cheers, boosts, video recommendations, pokes
 *                              (from localStorage unified list + Supabase community_posts)
 *  3. activity_log            — non-video activity logged by BrainLovers
 *  4. aha insights            — checkins with non-empty aha_insight text
 *  5. streak milestones       — derived from checkins (every 5-day streak)
 *  6. SOS events              — community_posts with type='sos'
 *  7. virtual_sessions        — upcoming/completed sessions for this FreeBrainer
 *
 * Dev-bypass: returns mock timeline data from localStorage.
 *
 * @param patientId   — selected FreeBrainer's user_id
 * @param patientName — display name for rendering
 * @param patientEmail — email for virtual session lookup
 * @param allPatients  — if provided, fetches timelines for ALL FreeBrainers
 *                       and merges them into one chronological list
 */
import { useState, useEffect, useCallback } from "react";
import { supabase, safeSupabaseQuery } from "@/lib/supabase";
import { fetchBrainLoverInteractions } from "@/lib/brainloverInteractions";
import { useVirtualSessions } from "@/features/sessions/useVirtualSessions";
import i18n from "@/lib/i18n";

export type TimelineEventType =
  | "checkin_moved"
  | "checkin_rested"
  | "checkin_tested"
  | "cheer"
  | "boost"
  | "recommend_video"
  | "poke"
  | "joint_move"
  | "activity_log"
  | "aha_insight"
  | "streak_milestone"
  | "sos"
  | "virtual_session";

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  title: string;
  description?: string;
  timestamp: string; // ISO
  authorName?: string;
}

function todayISO(): string {
  return new Date().toISOString();
}

function daysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

/** Shorthand for i18n.t with fallback */
function tr(key: string, fallback: string, opts?: any): string {
  return i18n.t(key, { defaultValue: fallback, ...opts }) as string;
}

/**
 * Build mock timeline events for dev-bypass mode.
 */
function buildMockTimeline(patientName: string): TimelineEvent[] {
  return [
    {
      id: "mock-1",
      type: "checkin_moved",
      title: tr("brainLoverUpdates.mock.checkinMoved", "{{name}} freed their brain", { name: patientName }),
      description: "20 minutes of Stretching",
      timestamp: todayISO(),
    },
    {
      id: "mock-2",
      type: "cheer",
      title: tr("brainLoverUpdates.mock.cheer", "You cheered for {{name}} today", { name: patientName }),
      description: tr("brainLoverUpdates.mock.cheerDesc", "Sent encouragement"),
      timestamp: todayISO(),
      authorName: tr("brainLoverUpdates.mock.you", "You"),
    },
    {
      id: "mock-3",
      type: "aha_insight",
      title: tr("brainLoverUpdates.mock.ahaMoment", "{{name}} had an Aha! moment", { name: patientName }),
      description: tr("brainLoverUpdates.mock.ahaDesc", "Felt steadier on my feet after stretching today."),
      timestamp: daysAgoISO(0),
    },
    {
      id: "mock-4",
      type: "boost",
      title: tr("brainLoverUpdates.mock.boost", "You boosted {{name}} +50 pts", { name: patientName }),
      description: tr("brainLoverUpdates.mock.boostDesc", "Daily boost applied"),
      timestamp: daysAgoISO(0),
      authorName: tr("brainLoverUpdates.mock.you", "You"),
    },
    {
      id: "mock-5",
      type: "checkin_moved",
      title: tr("brainLoverUpdates.mock.checkinMoved", "{{name}} freed their brain", { name: patientName }),
      description: "15 minutes of Balance work",
      timestamp: daysAgoISO(1),
    },
    {
      id: "mock-6",
      type: "streak_milestone",
      title: tr("brainLoverUpdates.mock.streak", "{{name}} hit a 3-day streak", { name: patientName }),
      description: tr("brainLoverUpdates.mock.streakDesc", "Three days in a row of movement!"),
      timestamp: daysAgoISO(1),
    },
    {
      id: "mock-7",
      type: "activity_log",
      title: tr("brainLoverUpdates.mock.activity", "Walked in the park together"),
      description: tr("brainLoverUpdates.mock.activityDesc", "Logged by Sarah"),
      timestamp: daysAgoISO(2),
      authorName: "Sarah",
    },
    {
      id: "mock-8",
      type: "virtual_session",
      title: tr("brainLoverUpdates.mock.sessionScheduled", "Virtual session scheduled"),
      description: "Friday at 2:00 PM",
      timestamp: daysAgoISO(3),
    },
  ];
}

/** Fetch the full timeline for a single FreeBrainer (real Supabase mode). */
async function fetchPatientTimeline(
  pid: string,
  pname: string,
  allEvents: TimelineEvent[]
): Promise<void> {
  // 1. Check-ins (last 30 days)
  const { data: checkins } = await safeSupabaseQuery<any>(() =>
    (supabase.from("daily_checkins") as any)
      .select("id, created_at, checkin_status, movement_type, duration_minutes, aha_insight")
      .eq("user_id", pid)
      .order("created_at", { ascending: false })
      .limit(60)
  );

  if (checkins && checkins.length > 0) {
    checkins.forEach((c: any) => {
      const status = c.checkin_status || (c.moved ? "moved" : "rested");
      if (status === "moved") {
        allEvents.push({
          id: `checkin-${pid}-${c.id}`,
          type: "checkin_moved",
          title: tr("brainLoverUpdates.checkinMoved", "{{name}} freed their brain", { name: pname }),
          description: c.duration_minutes
            ? `${c.duration_minutes} min${c.movement_type ? ` of ${c.movement_type}` : ""}`
            : undefined,
          timestamp: c.created_at,
        });
      } else if (status === "rested") {
        allEvents.push({
          id: `checkin-${pid}-${c.id}`,
          type: "checkin_rested",
          title: tr("brainLoverUpdates.checkinRested", "{{name}} rested their brain", { name: pname }),
          timestamp: c.created_at,
        });
      } else if (status === "tested") {
        allEvents.push({
          id: `checkin-${pid}-${c.id}`,
          type: "checkin_tested",
          title: tr("brainLoverUpdates.checkinTested", "{{name}} tested their brain", { name: pname }),
          timestamp: c.created_at,
        });
      }

      // Aha insight (if present)
      if (c.aha_insight && c.aha_insight.trim()) {
        allEvents.push({
          id: `aha-${pid}-${c.id}`,
          type: "aha_insight",
          title: tr("brainLoverUpdates.ahaMoment", "{{name}} had an Aha! moment", { name: pname }),
          description: c.aha_insight,
          timestamp: c.created_at,
        });
      }
    });

    // Streak milestones — derive from checkins
    let streak = 0;
    const sorted = [...checkins].reverse();
    let prevDate: string | null = null;
    sorted.forEach((c: any) => {
      const status = c.checkin_status || (c.moved ? "moved" : "rested");
      if (status !== "moved") {
        streak = 0;
        prevDate = null;
        return;
      }
      const dateStr = (c.created_at || "").split("T")[0];
      if (prevDate) {
        const prev = new Date(prevDate);
        const curr = new Date(dateStr);
        const diff = Math.round((curr.getTime() - prev.getTime()) / 86400000);
        if (diff === 1) streak++;
        else if (diff === 0) { /* same day */ }
        else streak = 1;
      } else {
        streak = 1;
      }
      prevDate = dateStr;

      if (streak > 0 && streak % 5 === 0) {
        allEvents.push({
          id: `streak-${pid}-${c.id}-${streak}`,
          type: "streak_milestone",
          title: tr("brainLoverUpdates.streakMilestone", "{{name}} hit a {{count}}-day streak", { name: pname, count: streak }),
          description: tr("brainLoverUpdates.streakMilestoneDesc", "{{count}} days in a row of movement!", { count: streak }),
          timestamp: c.created_at,
        });
      }
    });
  }

  // 2. BrainLover interactions (cheers, boosts, video recs, pokes)
  const interactions = await fetchBrainLoverInteractions(pid);
  interactions.forEach((inter) => {
    const typeMap: Record<string, TimelineEventType> = {
      cheer: "cheer",
      poke: "poke",
      recommend_video: "recommend_video",
    };
    allEvents.push({
      id: `inter-${pid}-${inter.id}`,
      type: typeMap[inter.type] || "cheer",
      title: inter.title,
      description: inter.message,
      timestamp: inter.created_at,
      authorName: inter.sender_name,
    });
  });

  // 3. Activity log entries (Supabase + localStorage fallback)
  const { data: activityLogs } = await safeSupabaseQuery<any>(() =>
    (supabase.from("activity_log") as any)
      .select("id, content, created_at, brainlover_id")
      .eq("freebrainer_id", pid)
      .order("created_at", { ascending: false })
      .limit(30)
  );

  const localLogRaw = localStorage.getItem(`fb_activity_log_${pid}`);
  let localLogs: any[] = [];
  if (localLogRaw) {
    try { localLogs = JSON.parse(localLogRaw); } catch (e) {}
  }

  const allLogs = [...(activityLogs || []), ...localLogs];
  const seenLogIds = new Set<string>();
  const dedupedLogs = allLogs.filter((a: any) => {
    if (seenLogIds.has(a.id)) return false;
    seenLogIds.add(a.id);
    return true;
  });

  if (dedupedLogs.length > 0) {
    const authorIds = [...new Set(dedupedLogs.map((a: any) => a.brainlover_id).filter(Boolean))];
    let nameMap = new Map<string, string>();
    if (authorIds.length > 0) {
      const { data: authorProfiles } = await safeSupabaseQuery<any>(() =>
        (supabase.from("profiles") as any)
          .select("user_id, display_name")
          .in("user_id", authorIds)
      );
      (authorProfiles || []).forEach((pro: any) => nameMap.set(pro.user_id, pro.display_name));
    }

    dedupedLogs.forEach((a: any) => {
      allEvents.push({
        id: `activity-${pid}-${a.id}`,
        type: "activity_log",
        title: a.content || tr("brainLoverUpdates.activityLogged", "Activity logged"),
        description: tr("brainLoverUpdates.loggedBy", "Logged by {{name}}", { name: nameMap.get(a.brainlover_id) || "BrainLover" }),
        timestamp: a.created_at,
        authorName: nameMap.get(a.brainlover_id),
      });
    });
  }

  // 3b. BrainLover shared notes
  const { data: blNotes } = await safeSupabaseQuery<any>(() =>
    (supabase.from("brainlover_notes") as any)
      .select("id, author_id, content, created_at")
      .eq("freebrainer_id", pid)
      .order("created_at", { ascending: false })
      .limit(20)
  );

  const localNotesRaw = localStorage.getItem(`fb_bl_notes_${pid}`);
  let localNotes: any[] = [];
  if (localNotesRaw) {
    try { localNotes = JSON.parse(localNotesRaw); } catch (e) {}
  }

  const allNotes = [...(blNotes || []), ...localNotes];
  const seenNoteIds = new Set<string>();
  const dedupedNotes = allNotes.filter((n: any) => {
    if (seenNoteIds.has(n.id)) return false;
    seenNoteIds.add(n.id);
    return true;
  });

  if (dedupedNotes.length > 0) {
    const noteAuthorIds = [...new Set(dedupedNotes.map((n: any) => n.author_id).filter(Boolean))];
    let noteNameMap = new Map<string, string>();
    if (noteAuthorIds.length > 0) {
      const { data: noteProfiles } = await safeSupabaseQuery<any>(() =>
        (supabase.from("profiles") as any)
          .select("user_id, display_name")
          .in("user_id", noteAuthorIds)
      );
      (noteProfiles || []).forEach((pro: any) => noteNameMap.set(pro.user_id, pro.display_name));
    }

    dedupedNotes.forEach((n: any) => {
      allEvents.push({
        id: `note-${pid}-${n.id}`,
        type: "activity_log",
        title: n.content || "Note shared",
        description: tr("brainLoverUpdates.noteBy", "Note by {{name}}", { name: noteNameMap.get(n.author_id) || n.author_name || "BrainLover" }),
        timestamp: n.created_at,
        authorName: noteNameMap.get(n.author_id) || n.author_name,
      });
    });
  }

  // 4. SOS events
  const { data: sosPosts } = await safeSupabaseQuery<any>(() =>
    (supabase.from("community_posts") as any)
      .select("id, content, created_at, author_name")
      .eq("user_id", pid)
      .eq("type", "sos")
      .order("created_at", { ascending: false })
      .limit(10)
  );

  if (sosPosts && sosPosts.length > 0) {
    sosPosts.forEach((s: any) => {
      allEvents.push({
        id: `sos-${pid}-${s.id}`,
        type: "sos",
        title: tr("brainLoverUpdates.sosHardDay", "{{name}} had a hard day", { name: pname }),
        description: s.content,
        timestamp: s.created_at,
        authorName: s.author_name,
      });
    });
  }
}

export function useBrainLoverUpdates(
  patientId: string | null | undefined,
  patientName: string | null | undefined,
  patientEmail?: string,
  allPatients?: { user_id: string; display_name?: string; email?: string }[]
) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { sessions } = useVirtualSessions(patientEmail);

  // Serialize allPatients to a stable string so the effect doesn't refire
  // on every render (the parent passes a new array reference each time).
  const allPatientsKey = allPatients
    ? allPatients.map((p) => `${p.user_id}:${p.display_name || ""}`).join("|")
    : "";
  // Stable sessions key — only refetch when session count or IDs change
  const sessionsKey = sessions
    ? sessions.map((s: any) => `${s.id}:${s.status}`).join("|")
    : "";

  const loadTimeline = useCallback(async () => {
    // ── Build the list of FreeBrainers to fetch timelines for ──
    const patientsToFetch: { id: string; name: string; email?: string }[] = [];

    if (allPatients && allPatients.length > 0) {
      allPatients.forEach((p) => {
        if (p.user_id) {
          patientsToFetch.push({
            id: p.user_id,
            name: p.display_name || "FreeBrainer",
            email: p.email,
          });
        }
      });
    } else if (patientId) {
      patientsToFetch.push({
        id: patientId,
        name: patientName || "FreeBrainer",
        email: patientEmail,
      });
    }

    if (patientsToFetch.length === 0) {
      setEvents([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const allEvents: TimelineEvent[] = [];

    try {
      // Fetch timelines for ALL FreeBrainers in parallel
      await Promise.all(
        patientsToFetch.map((p) => fetchPatientTimeline(p.id, p.name, allEvents))
      );

      // 5. Virtual sessions (from the hook — for the selected FreeBrainer)
      if (sessions && sessions.length > 0) {
        sessions.forEach((s: any) => {
          allEvents.push({
            id: `session-${s.id}`,
            type: "virtual_session",
            title: s.status === "completed"
              ? tr("brainLoverUpdates.sessionCompleted", "Virtual session completed")
              : tr("brainLoverUpdates.sessionScheduled", "Virtual session scheduled"),
            description: s.session_start
              ? new Date(s.session_start).toLocaleString(undefined, {
                  weekday: "short",
                  hour: "numeric",
                  minute: "2-digit",
                })
              : undefined,
            timestamp: s.created_at || s.session_start || todayISO(),
          });
        });
      }

      // Sort all events by timestamp descending
      allEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setEvents(allEvents);
    } catch (e) {
      console.warn("[FB-DEBUG] useBrainLoverUpdates error:", e);
      setEvents([]);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, patientName, patientEmail, allPatientsKey, sessionsKey]);

  useEffect(() => {
    loadTimeline();
  }, [loadTimeline]);

  return { events, loading, refetch: loadTimeline };
}
