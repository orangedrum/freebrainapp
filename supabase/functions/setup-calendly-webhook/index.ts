// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// ──────────────────────────────────────────────────────────────
// Calendly Webhook Setup → Supabase Edge Function
//
// One-time setup: registers the webhook subscription in Calendly
// so booking events flow to the calendly-webhook function.
//
// Required secrets:
//   CALENDLY_PAT  — your Calendly Personal Access Token
//   SUPABASE_URL  — your project URL (auto-set)
// ──────────────────────────────────────────────────────────────

const CALENDLY_API = "https://api.calendly.com";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const pat = Deno.env.get("CALENDLY_PAT");
    if (!pat) {
      return new Response(JSON.stringify({ error: "CALENDLY_PAT not set in Supabase secrets" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const webhookUrl = `${supabaseUrl}/functions/v1/calendly-webhook`;

    // ─── Step 1: Get current Calendly user ───
    console.log("[setup-calendly] Fetching Calendly user info...");
    const userResp = await fetch(`${CALENDLY_API}/users/me`, {
      headers: { Authorization: `Bearer ${pat}` },
    });

    if (!userResp.ok) {
      const errText = await userResp.text();
      return new Response(JSON.stringify({ error: `Calendly auth failed: ${errText}` }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const userData = await userResp.json();
    const userUri = userData.resource.uri;
    const organizationUri = userData.resource.current_organization;
    const userName = userData.resource.name;

    console.log("[setup-calendly] User:", userName, "Org:", organizationUri);

    // ─── Step 2: Check existing webhooks ───
    console.log("[setup-calendly] Checking existing webhooks...");
    const existingResp = await fetch(
      `${CALENDLY_API}/webhook_subscriptions?scope=user&user=${encodeURIComponent(userUri)}`,
      { headers: { Authorization: `Bearer ${pat}` } }
    );

    let existingWebhooks: Array<{ callback_url: string }> = [];
    if (existingResp.ok) {
      const existingData = await existingResp.json();
      existingWebhooks = existingData.collection || [];
      console.log("[setup-calendly] Found", existingWebhooks.length, "existing webhook(s)");
    }

    // Skip if already registered
    const alreadyRegistered = existingWebhooks.some(
      (w) => w.callback_url === webhookUrl
    );

    if (alreadyRegistered) {
      console.log("[setup-calendly] Webhook already registered — skipping");
      return new Response(JSON.stringify({
        success: true,
        message: "Webhook already registered",
        webhookUrl,
        user: userName,
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ─── Step 3: Register the webhook ───
    console.log("[setup-calendly] Registering webhook at:", webhookUrl);
    const registerResp = await fetch(`${CALENDLY_API}/webhook_subscriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${pat}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: webhookUrl,
        events: ["invitee.created", "invitee.canceled"],
        organization: organizationUri,
        user: userUri,
        scope: "user",
      }),
    });

    if (!registerResp.ok) {
      const errText = await registerResp.text();
      console.error("[setup-calendly] Registration failed:", errText);
      return new Response(JSON.stringify({ error: `Registration failed: ${errText}` }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const registerData = await registerResp.json();
    console.log("[setup-calendly] Webhook registered successfully!");

    return new Response(JSON.stringify({
      success: true,
      message: "Webhook registered successfully!",
      webhookUrl,
      user: userName,
      subscriptionId: registerData.resource?.uuid,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[setup-calendly] Unhandled error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
