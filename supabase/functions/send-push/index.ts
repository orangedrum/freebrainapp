// ──────────────────────────────────────────────────────────────
// send-push → Supabase Edge Function (Web Push fan-out, v1)
//
// POST JSON: {
//   "user_id"?: string, "user_ids"?: string[],   // recipients (one required)
//   "title": string,                              // notification title
//   "body"?: string, "url"?: string,              // url deep-links on tap (default "/")
//   "tag"?: string,                               // groups/replaces same-tag notifications
//   "badgeCount"?: number                         // app-icon badge (omit = untouched)
// }
//
// Reads push_subscriptions with the service_role key, sends via Web Push,
// and DELETES dead endpoints (410/404) so the table self-cleans.
//
// Required secrets (Supabase → Project Settings → Secrets, or
// `supabase secrets set`):
//   VAPID_PUBLIC_KEY   — 87-char public key (also VITE_VAPID_PUBLIC_KEY)
//   VAPID_PRIVATE_KEY  — 43-char private key (NEVER commit, NEVER client-side)
//   VAPID_SUBJECT      — e.g. "mailto:support@freebrain.app"
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (auto-set by Supabase)
//
// PRIVACY: payloads MUST stay health-free (names, counts, generic nudges).
// Never symptoms, streaks-as-medical-data, or clinical content — the SW
// renders whatever it receives onto a lock screen.
// ──────────────────────────────────────────────────────────────
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendPushBody {
  user_id?: string;
  user_ids?: string[];
  title: string;
  body?: string;
  url?: string;
  tag?: string;
  badgeCount?: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY") || "";
    const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY") || "";
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:support@freebrain.app";
    if (!vapidPublic || !vapidPrivate) {
      return Response.json(
        { error: "VAPID keys not configured (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY)" },
        { status: 500, headers: corsHeaders }
      );
    }
    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

    const payload = (await req.json()) as SendPushBody;
    const userIds = [...(payload.user_ids || []), ...(payload.user_id ? [payload.user_id] : [])].filter(Boolean);
    if (userIds.length === 0 || !payload.title) {
      return Response.json(
        { error: "Provide user_id(s) and title" },
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );
    const { data: subs, error: subsErr } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .in("user_id", userIds);
    if (subsErr) {
      return Response.json({ error: subsErr.message }, { status: 500, headers: corsHeaders });
    }
    if (!subs || subs.length === 0) {
      return Response.json({ sent: 0, pruned: 0, failed: 0, note: "no subscriptions" }, { headers: corsHeaders });
    }

    const pushBody = JSON.stringify({
      title: payload.title,
      body: (payload.body || "").slice(0, 120),
      url: payload.url || "/",
      tag: payload.tag,
      badgeCount: payload.badgeCount,
    });

    let sent = 0;
    let failed = 0;
    const deadEndpoints: string[] = [];
    await Promise.all(
      (subs as any[]).map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } } as any,
            pushBody
          );
          sent++;
        } catch (e: any) {
          // 404/410 = subscription gone (uninstalled, revoked) → prune it.
          if (e?.statusCode === 404 || e?.statusCode === 410) {
            deadEndpoints.push(sub.endpoint);
          } else {
            failed++;
            console.warn("[send-push] send failed:", e?.message || e);
          }
        }
      })
    );
    if (deadEndpoints.length > 0) {
      await supabase.from("push_subscriptions").delete().in("endpoint", deadEndpoints);
    }
    return Response.json(
      { sent, pruned: deadEndpoints.length, failed },
      { headers: corsHeaders }
    );
  } catch (e: any) {
    return Response.json({ error: e?.message || "unknown" }, { status: 500, headers: corsHeaders });
  }
});
