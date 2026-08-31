/**
 * InstallPromptCard — Post-check-in celebration install prompt.
 *
 * Shows after the user completes their first check-in (peak emotional moment).
 * Adapts to platform:
 *  - Android/Chrome: triggers native `beforeinstallprompt` (one-tap install)
 *  - iOS: Shows 3-step visual guide (Share → Add to Home Screen)
 *  - Desktop: Shows QR code + "Email me a link" button
 *
 * Framing: "You did it! Get the FreeBrain app" — not "Install PWA".
 *
 * Modular: receives `platform`, `canInstall`, `isInstalled`, `onPromptInstall`,
 * `userEmail` props from parent (which uses usePWAInstall hook).
 * i18n: all strings via `t("pwa.install.*")`.
 */

import React, { useState } from "react";
import { Smartphone, Download, Check, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IOSInstallGuide } from "./IOSInstallGuide";
import { AndroidInstallGuide } from "./AndroidInstallGuide";
import { SendToPhoneModal } from "./SendToPhoneModal";
import type { Platform } from "@/hooks/usePWAInstall";

interface InstallPromptCardProps {
  platform: Platform;
  canInstall: boolean;
  isInstalled: boolean;
  onPromptInstall: () => Promise<boolean>;
  userEmail: string;
  onDismiss?: () => void;
}

export const InstallPromptCard: React.FC<InstallPromptCardProps> = ({
  platform,
  canInstall,
  isInstalled,
  onPromptInstall,
  userEmail,
  onDismiss,
}) => {
  const { t } = useTranslation();
  const [isInstalling, setIsInstalling] = useState(false);
  const [showSendToPhone, setShowSendToPhone] = useState(false);
  const [installed, setInstalled] = useState(false);

  if (isInstalled || installed) return null;

  const handleInstall = async () => {
    // Any platform with a native install prompt (Android Chrome, Desktop Chrome, Edge)
    if (canInstall) {
      setIsInstalling(true);
      const accepted = await onPromptInstall();
      setIsInstalling(false);
      if (accepted) setInstalled(true);
      return;
    }
    // iOS has no native prompt — the guide is already shown, nothing to trigger
    if (platform === "ios") return;
    // Android without native prompt — the guide is already shown, nothing to trigger
    if (platform === "android") return;
    // Desktop without native prompt → QR / email fallback
    setShowSendToPhone(true);
  };

  return (
    <>
      <Card className="border-warning/30 bg-gradient-to-br from-warning/10 to-primary/5">
        <CardContent className="p-5 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-warning text-white shrink-0">
                <Smartphone className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-lg">
                  {t("pwa.install.title", "You did it! Get the FreeBrain app")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t("pwa.install.subtitle", "Add FreeBrain to your phone for quick daily check-ins.")}
                </p>
              </div>
            </div>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg shrink-0"
                aria-label={t("pwa.install.dismiss", "Dismiss")}
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Platform-specific content */}
          {platform === "ios" ? (
            /* iOS: no native prompt — show manual guide */
            <div className="space-y-3">
              <IOSInstallGuide />
            </div>
          ) : canInstall ? (
            /* Android/Chrome/Desktop with native prompt — one-tap install */
            <Button
              onClick={handleInstall}
              disabled={isInstalling}
              className="w-full h-12 gap-2 bg-warning hover:bg-warning/90 text-white"
            >
              {isInstalling ? (
                <Check className="h-5 w-5" />
              ) : (
                <Download className="h-5 w-5" />
              )}
              {isInstalling
                ? t("pwa.installing", "Installing...")
                : t("pwa.install.androidButton", "Add to Home Screen")}
            </Button>
          ) : platform === "android" ? (
            /* Android without native prompt (in-app browser, etc.) — manual guide */
            <div className="space-y-3">
              <AndroidInstallGuide />
            </div>
          ) : (
            /* Desktop without native prompt → QR / email fallback */
            <div className="space-y-3">
              <Button
                onClick={handleInstall}
                className="w-full h-12 gap-2 bg-warning hover:bg-warning/90 text-white"
              >
                <Smartphone className="h-5 w-5" />
                {t("pwa.install.desktopButton", "Get it on your phone")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Send to Phone modal (desktop) */}
      <SendToPhoneModal
        isOpen={showSendToPhone}
        onClose={() => setShowSendToPhone(false)}
        userEmail={userEmail}
      />
    </>
  );
};
