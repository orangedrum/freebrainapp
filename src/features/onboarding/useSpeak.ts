/**
 * useSpeak
 * ────────
 * Text-to-speech helper with i18n language detection.
 * Used across onboarding step components for accessibility.
 */

import { useCallback } from "react";
import i18n from "@/lib/i18n";

export function useSpeak() {
  return useCallback((text: string) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.95;
        const lang = i18n.language;
        utterance.lang =
          lang === "es" ? "es-ES" :
          lang === "de" ? "de-DE" :
          lang === "fr" ? "fr-FR" :
          lang === "pt" ? "pt-PT" :
          "en-US";
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn("Text-to-speech execution error:", err);
      }
    }
  }, []);
}
