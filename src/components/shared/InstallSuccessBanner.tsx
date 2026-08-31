/**
 * InstallSuccessBanner — Celebratory confirmation shown when the PWA
 * has just been installed or opened in standalone mode for the first time.
 *
 * Triggers:
 *  - `appinstalled` event fires (Android/Chrome)
 *  - `display-mode: standalone` media query changes to true
 *  - First launch in standalone mode (localStorage flag check)
 *
 * Shows a green success banner: "FreeBrain is installed!" with a dismiss
 * button. Auto-dismisses after 8 seconds.
 *
 * Modular: receives `justInstalled` and `onDismiss` props.
 * i18n: all strings via `t("pwa.success.*")`.
 */

import React, { useEffect } from "react";
import { CheckCircle2, X } from "lucide-react";
import { useTranslation } from "react-i18next";

interface InstallSuccessBannerProps {
  justInstalled: boolean;
  onDismiss: () => void;
}

export const InstallSuccessBanner: React.FC<InstallSuccessBannerProps> = ({
  justInstalled,
  onDismiss,
}) => {
  const { t } = useTranslation();

  // Auto-dismiss after 8 seconds
  useEffect(() => {
    if (!justInstalled) return;
    const timer = setTimeout(onDismiss, 8000);
    return () => clearTimeout(timer);
  }, [justInstalled, onDismiss]);

  if (!justInstalled) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-500/30 animate-in fade-in slide-in-from-top-2 duration-500"
    >
      <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400 shrink-0" />

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-emerald-900 dark:text-emerald-100">
          {t("pwa.success.title", "FreeBrain is installed!")}
        </p>
        <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
          {t("pwa.success.subtitle", "Find it on your home screen. Your daily check-ins are just one tap away.")}
        </p>
      </div>

      <button
        onClick={onDismiss}
        className="text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 dark:hover:text-emerald-100 p-1.5 rounded-lg shrink-0"
        aria-label={t("common.close", "Close")}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};
