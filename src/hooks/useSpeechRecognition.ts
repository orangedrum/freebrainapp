/**
 * useSpeechRecognition — Reusable Web Speech API hook.
 * Maps the current i18next language to the correct BCP-47 tag
 * so dictation works in Spanish, French, German, Portuguese, etc.
 *
 * Used by: CreatePostModal, and any future component needing voice input.
 */
import { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";

/** Map i18next language codes to BCP-47 speech recognition language tags */
const SPEECH_LANG_MAP: Record<string, string> = {
  en: "en-US",
  es: "es-ES",
  fr: "fr-FR",
  de: "de-DE",
  pt: "pt-BR",
};

export interface UseSpeechRecognitionOptions {
  /** Called when the user's transcript updates */
  onTranscript?: (text: string) => void;
  /** Initial text to prepend to the transcript */
  getInitialText?: () => string;
  /** Fallback alert message key if the API isn't supported */
  unsupportedMessage?: string;
}

export function useSpeechRecognition(options: UseSpeechRecognitionOptions = {}) {
  const { i18n } = useTranslation();
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const initialContentRef = useRef<string>("");

  const start = useCallback(
    (onUpdate: (text: string) => void) => {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        if (options.unsupportedMessage) alert(options.unsupportedMessage);
        return false;
      }

      try {
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = SPEECH_LANG_MAP[i18n.language] || "en-US";

        initialContentRef.current = options.getInitialText
          ? `${options.getInitialText().trim()} `
          : "";

        recognition.onstart = () => setIsListening(true);

        recognition.onresult = (event: any) => {
          let sessionTranscript = "";
          for (let i = 0; i < event.results.length; i++) {
            sessionTranscript += event.results[i][0].transcript;
          }
          onUpdate(initialContentRef.current + sessionTranscript);
        };

        recognition.onerror = (err: any) => {
          console.error("Speech recognition error:", err);
          setIsListening(false);
        };

        recognition.onend = () => setIsListening(false);

        recognition.start();
        return true;
      } catch (err) {
        console.error("Failed to start speech recognition:", err);
        setIsListening(false);
        return false;
      }
    },
    [i18n.language, options]
  );

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        /* already stopped */
      }
    }
    setIsListening(false);
  }, []);

  const toggle = useCallback(
    (onUpdate: (text: string) => void) => {
      if (isListening) {
        stop();
      } else {
        start(onUpdate);
      }
    },
    [isListening, start, stop]
  );

  return { isListening, toggle, start, stop };
}
