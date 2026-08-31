/**
 * Returns the correct Supabase OTP redirect URL.
 *
 * Supabase only sends the magic-link email if `emailRedirectTo` matches
 * a URL in the Auth → URL Configuration → Redirect URLs list.
 * When testing on a preview URL (e.g. vibepreview.com), `window.location.origin`
 * is NOT in that list, so Supabase silently drops the email.
 *
 * This helper uses the production URL as a fallback so invites work everywhere.
 */
const PRODUCTION_ORIGIN = "https://app.freethebrains.com";

export function getOtpRedirectUrl(path: string = "/join"): string {
  const origin = typeof window !== "undefined" ? window.location.origin : PRODUCTION_ORIGIN;
  // Use production URL if we're NOT on the production domain
  if (!origin.includes("freethebrains.com")) {
    return `${PRODUCTION_ORIGIN}${path}`;
  }
  return `${origin}${path}`;
}
