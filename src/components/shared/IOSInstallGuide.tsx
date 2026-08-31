/**
 * iOSInstallGuide — 3-step visual guide for adding to Home Screen on iOS.
 *
 * iOS doesn't support `beforeinstallprompt`, so users must manually:
 *  1. Tap the Share button
 *  2. Scroll and tap "Add to Home Screen"
 *  3. Tap "Add"
 *
 * This component renders large icons + numbered steps (not walls of text).
 * Accessible: 48px+ tap targets, keyboard navigable, screen-reader friendly.
 *
 * Modular: self-contained, receives no props.
 * i18n: all strings via `t("pwa.ios.*")`.
 */

import React from "react";
import { Share, Plus, Home } from "lucide-react";
import { useTranslation } from "react-i18next";

export const IOSInstallGuide: React.FC = () => {
  const { t } = useTranslation();

  const steps = [
    {
      icon: <Share className="h-8 w-8" />,
      title: t("pwa.ios.step1Title", "Tap the Share button"),
      desc: t("pwa.ios.step1Desc", "It's at the bottom of Safari."),
    },
    {
      icon: <Plus className="h-8 w-8" />,
      title: t("pwa.ios.step2Title", "Tap 'Add to Home Screen'"),
      desc: t("pwa.ios.step2Desc", "Scroll down to find it."),
    },
    {
      icon: <Home className="h-8 w-8" />,
      title: t("pwa.ios.step3Title", "Tap 'Add'"),
      desc: t("pwa.ios.step3Desc", "FreeBrain will appear on your home screen."),
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
