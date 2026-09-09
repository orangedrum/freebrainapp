/**
 * Returns the correct Supabase OTP redirect URL for the current environment.
 *
 * Always uses `window.location.origin` so magic links resolve to the same
 * host the user is on (localhost, Vercel preview, or production).
 *
 * IMPORTANT: Every Supabase project must have ALL valid origins in
 * Auth → URL Configuration → Redirect URLs:
 *   - https://app.freethebrains.com
 *   - https://*.vercel.app  (or specific preview domains)
 *   - http://localhost:*
 */
export function getOtpRedirectUrl(path: string = "/join"): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://app.freethebrains.com";
  return `${origin}${path}`;
}
