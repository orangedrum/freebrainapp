# Calendly Webhook Setup Guide (Phase 2)

This guide walks you through wiring Calendly to automatically populate the `virtual_sessions` table via a Supabase Edge Function.

## Prerequisites

- Your Supabase project URL (e.g., `https://omcbwbhtjrozbgvzqdya.supabase.co`)
- Your Calendly Personal Access Token (PAT)
- Supabase CLI installed (`npm install -g supabase`)

## Step 1: Deploy the Edge Function

```bash
# From your project root
supabase functions deploy calendly-webhook --no-verify-jwt
```

The `--no-verify-jwt` flag is required because Calendly sends webhook POSTs without a Supabase JWT. The function handles its own verification via the Calendly API.

## Step 2: Set Secrets

```bash
# Your Calendly PAT (Personal Access Token)
supabase secrets set CALENDLY_PAT=your_calendly_pat_here
```

## Step 3: Find Your Calendly Organization & User UUIDs

```bash
curl -H "Authorization: Bearer YOUR_CALENDLY_PAT" \
  https://api.calendly.com/users/me
```

This returns JSON with `resource.uri` (your user UUID) and `resource.current_organization` (your org UUID). Save both.

## Step 4: Register the Webhook in Calendly

```bash
curl -X POST https://api.calendly.com/webhook_subscriptions \
  -H "Authorization: Bearer YOUR_CALENDLY_PAT" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://YOUR_PROJECT.supabase.co/functions/v1/calendly-webhook",
    "events": ["invitee.created", "invitee.canceled"],
    "organization": "https://api.calendly.com/organizations/YOUR_ORG_UUID",
    "user": "https://api.calendly.com/users/YOUR_USER_UUID",
    "scope": "user"
  }'
```

Replace:
- `YOUR_PROJECT` with your Supabase project ref
- `YOUR_ORG_UUID` with the org UUID from Step 3
- `YOUR_USER_UUID` with the user UUID from Step 3

## Step 5: Test

1. Open your Calendly scheduling link
2. Book a test session using your FreeBrain account email
3. Check the Supabase `virtual_sessions` table — a new row should appear within seconds
4. Open the FreeBrain app → FreeBrainer dashboard → the session should show in the calendar

## Step 6: Clean Up Test Data

Once the webhook is working, delete the seed rows:

```sql
DELETE FROM public.virtual_sessions
WHERE calendly_event_id IS NULL;
```

This removes the manual test rows while keeping webhook-created sessions.

## Admin Test Panel (No Webhook Required)

Admins can test the VirtualSessionCalendar component without the webhook by using the **Session Test Panel** on the Profile page (admin tools section). This panel injects real rows into the `virtual_sessions` table tagged with `calendly_event_id = 'TEST_*'`:

- **Add Session in 5 Min** — tests the "Join Now" button appearing
- **Add Session in 2 Days** — tests normal upcoming state
- **Add Completed Session** — tests past sessions list
- **Clear All Test Sessions** — removes all `TEST_*` rows

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Webhook returns 500 | Check Supabase function logs: `supabase functions logs calendly-webhook` |
| No row in virtual_sessions | Verify `CALENDLY_PAT` secret is set and valid |
| Session not showing in UI | Check that the booking email matches the FreeBrainer's account email |
| Duplicate sessions | The `calendly_event_id` unique constraint prevents duplicates — check for errors in the upsert |

## Email Matching

The webhook uses the invitee's email from Calendly to match sessions to FreeBrainer accounts. To maximize match rate:

1. The CalendlyModal pre-fills the user's FreeBrain email
2. The webhook stores the email as-is
3. If an email doesn't match any FreeBrainer, the row is stored with `status = 'unmatched'` (future feature: admin reconciliation)

## Security Notes

- The Edge Function runs with the Supabase service role key (bypasses RLS)
- The Calendly PAT is stored as a Supabase secret — never exposed to the client
- No sensitive (Tier 1) health data passes through this webhook
