import i18n from "@/lib/i18n";
import { supabase } from "@/lib/supabase";

/**
 * Single source of truth for language switching.
 * 1. Updates i18next runtime (instantly re-renders all t() calls).
 * 2. LanguageDetector caches to localStorage automatically.
 * 3. Persists to DB profiles.locale (fire-and-forget) so next login restores.
 *
 * All language switchers across the app should call this — never call
 * i18n.changeLanguage() directly or manage a separate `locale` state variable.
 */
export async function changeLanguage(lang: string, userId?: string): Promise<void> {
  await i18n.changeLanguage(lang);

  // Mark that the user explicitly chose this language this session
  // so Profile.tsx won't override it with the stale DB value on re-render
  sessionStorage.setItem("lang_user_set", "1");

  // Persist to DB so the preference survives across devices/sessions
  if (userId) {
    try {
      const { error } = await (supabase
        .from("profiles") as any)
        .update({ locale: lang, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
    } catch (e) {
      console.warn("Failed to persist locale to DB:", e);
    }
  }
}

/**
 * Returns the current language code (e.g. "en", "es") without region suffix.
 */
export function getCurrentLanguage(): string {
  return (i18n.language || "en").split("-")[0];
}
