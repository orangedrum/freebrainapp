// ──────────────────────────────────────────────────────────────
// send-scheduled-notifications → Supabase Edge Function (step 3)
//
// Triggered every 5 minutes by pg_cron (migration 54) via pg_net. Computes
// three time-of-day jobs and hands delivery off to send-push (single choke
// point) — this function never touches web-push/VAPID itself.
//
//   • session-t15 — a virtual session starts in ≤15 min → remind both people
//   • morning     — a FreeBrainer hasn't checked in yet, 08:00–10:00 local
//   • streak-risk — a FreeBrainer moved yesterday but not today, 17:00–20:00
//                   local → gentle nudge to their linked supporters
//
// Privacy: payloads are health-free (names + generic nudges — no counts, no
// symptoms, no clinical words). Quiet hours 21:00–08:00 (recipient-local) are
// respected. Delivery is deduped per (kind, recipient, local-day) except in
// explicit test mode. Test mode requires the FB_NOTIFY_TEST_TOKEN secret and
// a matching `x-fb-test-token` header, and is DISABLED when the secret is unset.
//
// Required secrets: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (auto),
//   FB_NOTIFY_TEST_TOKEN (optional).
// ──────────────────────────────────────────────────────────────
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-fb-test-token",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const SEND_PUSH_URL = `${SUPABASE_URL}/functions/v1/send-push`;
const sb = createClient(SUPABASE_URL, SERVICE_KEY);

// ── time helpers (recipient-local) ─────────────────────────────
function localParts(tz: string, at: Date): { date: string; hour: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", hour12: false, hourCycle: "h23",
  }).formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value || "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, hour: parseInt(get("hour"), 10) };
}
function prevDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().split("T")[0];
}
function inQuietHours(tz: string, at: Date): boolean {
  const h = localParts(tz, at).hour;
  return h >= 21 || h < 8;
}

// ── delivery helpers ───────────────────────────────────────────
async function sendPush(userIds: string[], body: { title: string; body: string; url?: string; tag?: string; toggle?: string; badgeCount?: number }): Promise<{ sent: number; filtered: number }> {
  const targets = [...new Set(userIds.filter(Boolean))];
  if (targets.length === 0) return { sent: 0, filtered: 0 };
  try {
    const res = await fetch(SEND_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
      body: JSON.stringify({ user_ids: targets, ...body }),
    });
    const json = (await res.json().catch(() => ({}))) as { sent?: number; filtered?: number };
    return { sent: json.sent ?? 0, filtered: json.filtered ?? 0 };
  } catch (e) {
    console.warn("[sched] send-push call failed:", e);
    return { sent: 0, filtered: 0 };
  }
}

/** Insert a dedupe claim; returns true only if WE own this send. */
async function claim(kind: string, recipientId: string, dayKey: string, force: boolean): Promise<boolean> {
  if (force) return true;
  const { data, error } = await sb
    .from("notification_deliveries")
    .upsert({ kind, recipient_id: recipientId, day_key: dayKey }, { onConflict: "kind,recipient_id,day_key", ignoreDuplicates: true })
    .select("id");
  if (error) {
    console.warn("[sched] dedupe insert failed (skipping to avoid dupes):", error.message);
    return false;
  }
  return Array.isArray(data) && data.length > 0;
}

async function roleMap(userIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (userIds.length === 0) return map;
  const { data } = await sb.from("user_roles").select("user_id, role").in("user_id", userIds);
  for (const r of (data as any[]) || []) map.set(r.user_id, r.role);
  return map;
}

// ── job 1: session starts in ≤15 min ───────────────────────────
async function jobSessionT15(force: boolean) {
  const now = new Date();
  const in15 = new Date(now.getTime() + 15 * 60 * 1000);
  let query = sb.from("virtual_sessions")
    .select("id, freebrainer_email, brainlover_email, session_start")
    .eq("status", "upcoming").is("reminder_sent_at", null)
    .order("session_start", { ascending: true });
  query = force ? query : query.gte("session_start", now.toISOString()).lte("session_start", in15.toISOString());
  const { data: sessions, error } = await query.limit(50);
  if (error) { console.warn("[sched] sessions query:", error.message); return null; }
  if (!sessions || sessions.length === 0) return null;

  const emails = [...new Set(sessions.flatMap((s: any) => [s.freebrainer_email, s.brainlover_email]).filter(Boolean).map((e: string) => e.toLowerCase()))];
  const { data: profiles } = await sb.from("profiles").select("user_id, email").in("email", emails);
  const byEmail = new Map<string, string>();
  for (const p of (profiles as any[]) || []) byEmail.set(String(p.email).toLowerCase(), p.user_id);

  const { data: prefRows } = await sb.from("notification_prefs").select("user_id, timezone").in("user_id", [...byEmail.values()]);
  const tzByUser = new Map<string, string>();
  for (const p of (prefRows as any[]) || []) if (p.timezone) tzByUser.set(p.user_id, p.timezone);

  const processedIds: string[] = [];
  const out = { sent: 0, filtered: 0 };
  for (const s of sessions as any[]) {
    const recipients = [byEmail.get(String(s.freebrainer_email).toLowerCase()), byEmail.get(String(s.brainlover_email).toLowerCase())]
      .filter(Boolean)
      .filter((uid) => force || !(tzByUser.get(uid) && inQuietHours(tzByUser.get(uid)!, now)));
    const r = await sendPush(recipients as string[], {
      title: "FreeBrain",
      body: "⏰ Your session starts in 15 minutes — tap to get ready.",
      url: "/", tag: "session-t15", toggle: "sessionReminders",
    });
    out.sent += r.sent;
    out.filtered += r.filtered;
    processedIds.push(s.id);
  }
  if (!force && processedIds.length > 0) {
    await sb.from("virtual_sessions").update({ reminder_sent_at: now.toISOString() }).in("id", processedIds);
  }
  return out;
}

// ── job 2: morning check-in nudge ──────────────────────────────
async function jobMorning(force: boolean, now: Date) {
  const { data: prefs, error } = await sb.from("notification_prefs").select("user_id, role, timezone");
  if (error) { console.warn("[sched] prefs query:", error.message); return null; }
  const rows = ((prefs as any[]) || []).filter((p) => p.timezone);
  const roles = await roleMap(rows.map((p) => p.user_id));

  const inWindow = rows.filter((p) => {
    const role = roles.get(p.user_id) || p.role;
    if (role !== "freebrainer") return false;
    const { hour } = localParts(p.timezone, now);
    return force || (hour >= 8 && hour < 10);
  });
  if (inWindow.length === 0) return null;

  const ids = inWindow.map((p) => p.user_id);
  const since = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const { data: checkins } = await sb.from("daily_checkins").select("user_id, checkin_date").in("user_id", ids).gte("checkin_date", since);
  const done = new Set(((checkins as any[]) || []).map((c) => `${c.user_id}|${c.checkin_date}`));

  const out = { sent: 0, filtered: 0 };
  for (const p of inWindow) {
    const today = localParts(p.timezone, now).date;
    if (done.has(`${p.user_id}|${today}`)) continue;
    if (!(await claim("morning", p.user_id, today, force))) continue;
    const r = await sendPush([p.user_id], {
      title: "FreeBrain",
      body: "☀️ Good morning! A few minutes of movement sets up the whole day.",
      url: "/", tag: "morning", toggle: "checkinReminders",
    });
    out.sent += r.sent;
    out.filtered += r.filtered;
  }
  return out;
}

// ── job 3: streak at risk → supporters ─────────────────────────
async function jobStreakRisk(force: boolean, now: Date) {
  const since = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const { data: checkins, error } = await sb.from("daily_checkins").select("user_id, checkin_date").gte("checkin_date", since);
  if (error) { console.warn("[sched] checkins query:", error.message); return null; }
  const byUser = new Map<string, Set<string>>();
  for (const c of (checkins as any[]) || []) {
    if (!byUser.has(c.user_id)) byUser.set(c.user_id, new Set());
    byUser.get(c.user_id)!.add(c.checkin_date);
  }

  const { data: prefs } = await sb.from("notification_prefs").select("user_id, timezone");
  const tzByUser = new Map<string, string>();
  for (const p of (prefs as any[]) || []) if (p.timezone) tzByUser.set(p.user_id, p.timezone);

  // FreeBrainers who moved yesterday (local) and not today (local).
  const atRisk: { userId: string; tz: string }[] = [];
  for (const [userId, dates] of byUser) {
    const tz = tzByUser.get(userId);
    if (!tz) continue;
    const today = localParts(tz, now).date;
    const yesterday = prevDate(today);
    if (dates.has(yesterday) && !dates.has(today)) atRisk.push({ userId, tz });
  }
  if (atRisk.length === 0) return null;

  const patients = atRisk.map((r) => r.userId);
  const { data: links } = await sb.from("caregiver_links").select("caregiver_id, patient_id").in("patient_id", patients);
  const { data: names } = await sb.from("profiles").select("user_id, display_name").in("user_id", patients);
  const nameByUser = new Map<string, string>();
  for (const n of (names as any[]) || []) if (n.display_name) nameByUser.set(n.user_id, n.display_name);
  const tzByPatient = new Map(atRisk.map((r) => [r.userId, r.tz]));

  const out = { sent: 0, filtered: 0 };
  for (const link of (links as any[]) || []) {
    const tz = tzByUser.get(link.caregiver_id) || tzByPatient.get(link.patient_id);
    if (!tz) continue;
    const { hour } = localParts(tz, now);
    if (!force && (hour < 17 || hour >= 20)) continue;
    const today = localParts(tz, now).date;
    if (!(await claim("streak-risk", link.caregiver_id, today, force))) continue;
    const name = nameByUser.get(link.patient_id) || "Your FreeBrainer";
    const r = await sendPush([link.caregiver_id], {
      title: "FreeBrain",
      body: `🌱 ${name} hasn't moved yet today — a quick word from you could keep the streak alive.`,
      url: "/", tag: "streak-risk", toggle: "freebrainerStreaks", badgeCount: 1,
    });
    out.sent += r.sent;
    out.filtered += r.filtered;
  }
  return out;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Test mode: force every job, ignore time windows and dedupe. Enabled ONLY
  // when FB_NOTIFY_TEST_TOKEN is set AND the caller presents it — via the
  // `x-fb-test-token` header OR a `test_token` body field (the Dashboard
  // "Invoke" panel can send a body but not custom headers).
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const testToken = Deno.env.get("FB_NOTIFY_TEST_TOKEN") || "";
  const provided = req.headers.get("x-fb-test-token") || body?.test_token || "";
  const force = !!testToken && provided === testToken;
  const now = new Date();

  try {
    const jobs: Record<string, { sent: number; filtered: number } | null> = {
      sessionT15: await jobSessionT15(force),
      morning: await jobMorning(force, now),
      streakRisk: await jobStreakRisk(force, now),
    };
    return Response.json({ ok: true, force, ranAt: now.toISOString(), jobs }, { headers: corsHeaders });
  } catch (e: any) {
    return Response.json({ error: e?.message || "unknown" }, { status: 500, headers: corsHeaders });
  }
});
