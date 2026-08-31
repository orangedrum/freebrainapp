/**
 * AndroidInstallGuide — 3-step visual guide for adding to Home Screen on Android.
 *
 * When `beforeinstallprompt` doesn't fire (some Android browsers, in-app browsers),
 * users must manually add the PWA via the browser menu.
 *
 * Steps:
 *  1. Tap the browser menu (⋮)
 *  2. Tap "Add to Home screen" / "Install app"
 *  3. Tap "Add" / "Install"
 *
 * Accessible: 48px+ tap targets, keyboard navigable, screen-reader friendly.
 *
 * Modular: self-contained, receives no props.
 * i18n: all strings via `t("pwa.android.*")`.
 */

import React from "react";
import { MoreVertical, Plus, Home } from "lucide-react";
import { useTranslation } from "react-i18next";

export const AndroidInstallGuide: React.FC = () => {
  const { t } = useTranslation();

  const steps = [
    {
      icon: <MoreVertical className="h-8 w-8" />,
      title: t("pwa.android.step1Title", "Tap the menu (⋮)"),
      desc: t("pwa.android.step1Desc", "It's in the top-right of Chrome."),
    },
    {
      icon: <Plus className="h-8 w-8" />,
      title: t("pwa.android.step2Title", "Tap 'Add to Home screen'"),
      desc: t("pwa.android.step2Desc", "Or 'Install app' if you see that option."),
    },
    {
      icon: <Home className="h-8 w-8" />,
      title: t("pwa.android.step3Title", "Tap 'Add'"),
      desc: t("pwa.android.step3Desc", "FreeBrain will appear on your home screen."),
    },
  ];

  return (
    <div className="space-y-4" role="list">
      {steps.map((step, i) => (
        <div
          key={i}
          role="listitem"
          className="flex items-start gap-4 p-4 rounded-xl bg-primary/5 border border-primary/10"
        >
          <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary text-primary-foreground font-bold text-lg shrink-0">
            {i + 1}
          </div>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="text-primary shrink-0">{step.icon}</span>
            <div className="min-w-0">
              <p className="font-semibold text-sm">{step.title}</p>
              <p className="text-xs text-muted-foreground">{step.desc}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
