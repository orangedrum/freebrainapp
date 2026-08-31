// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// ──────────────────────────────────────────────────────────────
// Calendly Webhook → Supabase Edge Function
//
// Receives Calendly webhook payloads, fetches full event details
// from the Calendly API, and inserts/updates a row in the
// `virtual_sessions` table.
//
// Required secrets (set in Supabase → Project Settings → Secrets):
//   CALENDLY_PAT              — your Calendly Personal Access Token
//   SUPABASE_URL              — your project URL (auto-set by Supabase)
//   SUPABASE_SERVICE_ROLE_KEY — service role key (auto-set by Supabase)
// ──────────────────────────────────────────────────────────────

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── Calendly Webhook Payload (v2 API) ───
// Calendly puts invitee data directly in `payload`, not nested.
// `payload.event` = the scheduled event URI (to fetch details)
// `payload.uri`   = the invitee URI
// `payload.email`  = invitee email
// `payload.name`   = invitee name
interface CalendlyPayload {
  event: string; // "invitee.created" | "invitee.canceled"
  time: string;
  payload: {
    cancel_url: string | null;
    created_at: string;
    email: string; // invitee email (directly in payload)
    event: string; // scheduled event URI — e.g. https://api.calendly.com/scheduled_events/UUID
    name: string; // invitee name
    new_invitee: string | null;
    old_invitee: string | null;
    reschedule_cancel_reason: string | null;
    reschedule_url: string | null;
    rescheduled: boolean;
    status: string; // "active" | "canceled"
    text_reminder_number: string | null;
    timezone: string;
    updated_at: string;
    uri: string; // invitee URI
    canceled_by?: string;
    cancellation_reason?: string;
  };
}

async function fetchCalendlyResource(url: string, token: string) {
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) {
    throw new Error(`Calendly API error ${resp.status}: ${await resp.text()}`);
  }
  return resp.json();
}

Deno.serve(async (req: Request) => {
  // ─── Log ALL incoming requests for debugging ───
  console.log("[calendly-webhook] Received request:", req.method, req.url);

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const rawBody = await req.text();
    console.log("[calendly-webhook] Raw body length:", rawBody.length);
    console.log("[calendly-webhook] Raw body (first 500 chars):", rawBody.substring(0, 500));

    const body: CalendlyPayload = JSON.parse(rawBody);

    console.log("[calendly-webhook] Parsed event:", body.event);
    console.log("[calendly-webhook] Payload keys:", Object.keys(body.payload || {}));

    // ─── Validate payload ───
    if (!body.payload || !body.payload.event) {
      console.error("[calendly-webhook] Invalid payload — missing payload.event");
      console.error("[calendly-webhook] Full body:", JSON.stringify(body, null, 2));
      return new Response(JSON.stringify({
        error: "Invalid payload — missing payload.event",
        receivedEvent: body.event,
        payloadKeys: body.payload ? Object.keys(body.payload) : "no payload"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ─── Init Supabase client with service role (bypasses RLS) ───
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ─── Get Calendly PAT ───
    const calendlyToken = Deno.env.get("CALENDLY_PAT");
    if (!calendlyToken) {
      console.error("[calendly-webhook] CALENDLY_PAT not set");
      return new Response(JSON.stringify({ error: "Server misconfigured — CALENDLY_PAT not set" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const eventType = body.event; // "invitee.created" or "invitee.canceled"

    // ─── Invitee data is directly in the payload (no API call needed) ───
    const inviteeEmail = body.payload.email;
    const inviteeName = body.payload.name;
    const inviteeStatus = body.payload.status;

    console.log("[calendly-webhook] Invitee:", inviteeName, inviteeEmail, "status:", inviteeStatus);

    // ─── Fetch the scheduled event details from Calendly API ───
    // This gives us start_time, end_time, join_url, host info, etc.
    const eventUrl = body.payload.event;
    console.log("[calendly-webhook] Fetching event details from:", eventUrl);

    const eventData = await fetchCalendlyResource(eventUrl, calendlyToken);
    const event = eventData.resource;

    const sessionStart = event.start_time; // ISO 8601
    const sessionEnd = event.end_time; // ISO 8601
    const joinUrl = event.location?.join_url || event.location?.data?.meeting_url || null;
    const calendlyEventId = event.uuid;
    const hostEmail = event.event_members?.[0]?.email || null;
    const hostName = event.event_members?.[0]?.name || null;

    console.log(
      "[calendly-webhook] Processing",
      eventType,
      "for",
      inviteeEmail,
      "at",
      sessionStart,
      "| host:",
      hostEmail,
      "| joinUrl:",
      joinUrl ? "yes" : "no"
    );

    if (eventType === "invitee.created") {
      // ─── Upsert session ───
      const { error } = await supabase
        .from("virtual_sessions")
        .upsert(
          {
            freebrainer_email: inviteeEmail,
            freebrainer_name: inviteeName,
            brainlover_email: hostEmail,
            brainlover_name: hostName,
            session_start: sessionStart,
            session_end: sessionEnd,
            status: "upcoming",
            join_url: joinUrl,
            calendly_event_id: calendlyEventId,
          },
          { onConflict: "calendly_event_id" }
        );

      if (error) {
        console.error("[calendly-webhook] Upsert error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      console.log("[calendly-webhook] ✅ Session saved for", inviteeEmail);
    } else if (eventType === "invitee.canceled") {
      // ─── Mark as cancelled ───
      const { error } = await supabase
        .from("virtual_sessions")
        .update({ status: "cancelled" })
        .eq("calendly_event_id", calendlyEventId);

      if (error) {
        console.error("[calendly-webhook] Cancel error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      console.log("[calendly-webhook] ✅ Session cancelled for", inviteeEmail);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[calendly-webhook] Unhandled error:", err);
    return new Response(JSON.stringify({ error: "Internal error", details: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
