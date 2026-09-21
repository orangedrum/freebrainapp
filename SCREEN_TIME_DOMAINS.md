# Screen Time Domain Whitelist

When a parent enables **Content & Privacy Restrictions → Limit Adult Websites → Approved Websites Only** on an iOS device, ONLY the domains listed below will be accessible. Add ALL of these to the approved list.

## Core App Domains

| Domain | Purpose |
|---|---|
| `freebrain.app` | App origin (production) |
| `app.freethebrains.com` | Alternate production domain |
| `localhost` | Development |

## Platform Infrastructure

| Domain | Purpose |
|---|---|
| `appcdn.leadconnectorhq.com` | LeadConnector/Vibe platform CDN (JS, CSS, manifest) |
| `vibe.filesafe.space` | Platform-hosted OG images and assets |
| `*.leadconnectorhq.com` | All LeadConnector platform resources |

## Supabase (API + Auth + Database)

| Domain | Purpose |
|---|---|
| `omcbwbhtjrozbgvzqdya.supabase.co` | Supabase project instance |
| `*.supabase.co` | All Supabase infrastructure |
| `*.supabase.db` | Supabase database |

## Auth & Identity

| Domain | Purpose |
|---|---|
| `auth.freebrain.app` | Auth endpoint (if separate) |

## Third-Party Services

| Domain | Purpose |
|---|---|
| `consent.cookiebot.com` | Cookie consent banner (Cookiebot) |
| `www.youtube.com` | YouTube video embeds |
| `youtube.com` | YouTube video embeds |
| `*.ytimg.com` | YouTube thumbnails |

## Notes

- If the app is served from a different domain (e.g., a LeadConnector/Vibe subdomain), add that domain too.
- The `manifest.json` at the project root is a LeadConnector/Vibe platform descriptor — it is NOT a PWA manifest. A proper PWA manifest is at `public/pwa-manifest.json`.
- If Screen Time blocks `*.supabase.co`, the app cannot authenticate or sync data. This is the #1 cause of onboarding failure under parental controls.
- The `vite-plugin-pwa` is NOT currently configured. The PWA is recognized via the standard `pwa-manifest.json` + `index.html` `<link rel="manifest">`.
