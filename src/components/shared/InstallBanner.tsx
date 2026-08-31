/**
 * InstallBanner — Persistent dashboard banner for non-installed PWA.
 *
 * Shows on the dashboard if the app isn't installed and the 3-day cooldown
 * has passed. Dismissible — sets a timestamp in localStorage.
 *
 * Platform behavior:
 *  - Android + native prompt → one-tap install (beforeinstallprompt)
 *  - Android without prompt → shows AndroidInstallGuide (manual steps)
 *  - iOS → shows IOSInstallGuide (Share → Add to Home Screen)
 *  - Desktop → SendToPhoneModal (QR code + email link)
 *
 * Also sends an email reminder (via Supabase OTP) when dismissed, since
 * users often report "I can't find it" due to the PWA hiding in a browser tab.
 *
 * Modular: receives `platform`, `isInstalled`, `shouldShowBanner`, `userEmail`
 * props from parent (which uses usePWAInstall hook).
 * i18n: all strings via `t("pwa.banner.*")`.
 */

import React, { useState, useCallback } from "react";
import { Smartphone, X, Mail, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { SendToPhoneModal } from "./SendToPhoneModal";
import { IOSInstallGuide } from "./IOSInstallGuide";
import { AndroidInstallGuide } from "./AndroidInstallGuide";
import type { Platform } from "@/hooks/usePWAInstall";

interface InstallBannerProps {
  platform: Platform;
  isInstalled: boolean;
  shouldShowBanner: boolean;
  canInstall: boolean;
  userEmail: string;
  onPromptInstall: () => Promise<boolean>;
  onDismiss: () => void;
}

export const InstallBanner: React.FC<InstallBannerProps> = ({
  platform,
  isInstalled,
  shouldShowBanner,
  canInstall,
  userEmail,
  onPromptInstall,
  onDismiss,
}) => {
  const { t } = useTranslation();
  const [isInstalling, setIsInstalling] = useState(false);
  const [showSendToPhone, setShowSendToPhone] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showAndroidGuide, setShowAndroidGuide] = useState(false);
  const [emailReminderSent, setEmailReminderSent] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const handleInstall = useCallback(async () => {
    if (canInstall) {
      // Android/Chrome/Desktop with native prompt — one-tap install
      setIsInstalling(true);
      await onPromptInstall();
      setIsInstalling(false);
    } else if (platform === "ios") {
      setShowIOSGuide(true);
    } else if (platform === "android") {
      // Android without native prompt (in-app browser, etc.) — manual guide
      setShowAndroidGuide(true);
    } else {
      // Desktop → QR / email
      setShowSendToPhone(true);
    }
  }, [platform, canInstall, onPromptInstall]);

  const handleDismiss = useCallback(async () => {
    // Send an email reminder before dismissing (users often lose the PWA tab)
    if (userEmail && !emailReminderSent) {
      setIsSendingEmail(true);
      try {
        await supabase.auth.signInWithOtp({
          email: userEmail,
          options: {
            emailRedirectTo: `https://app.freethebrains.com?install=1`,
          },
        });
        setEmailReminderSent(true);
      } catch (err) {
        console.error("[FB-DEBUG] Install reminder email failed:", err);
      } finally {
        setIsSendingEmail(false);
      }
    }
    onDismiss();
  }, [userEmail, emailReminderSent, onDismiss]);

  if (isInstalled || !shouldShowBanner) return null;

  return (
    <>
      <div className="flex items-center gap-3 p-4 rounded-xl bg-warning/10 border border-warning/30">
        <Smartphone className="h-5 w-5 text-warning shrink-0" />

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground">
            {t("pwa.banner.title", "Add FreeBrain to your phone")}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("pwa.banner.subtitle", "Quick daily check-ins right from your home screen.")}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            onClick={handleInstall}
            disabled={isInstalling}
            className="bg-warning hover:bg-warning/90 text-white h-9"
          >
            {isInstalling
              ? t("pwa.installing", "Installing...")
              : t("pwa.banner.installButton", "Add to phone")}
          </Button>
          <button
            onClick={handleDismiss}
            disabled={isSendingEmail}
            className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg shrink-0"
            aria-label={t("pwa.banner.dismiss", "Remind me later")}
          >
            {isSendingEmail ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <X className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* iOS guide inline expand */}
      {showIOSGuide && (
        <div className="p-4 rounded-xl bg-warning/5 border border-warning/20">
          <IOSInstallGuide />
          <Button
            size="sm"
            variant="outline"
            className="mt-3"
            onClick={() => setShowIOSGuide(false)}
          >
            {t("common.close", "Close")}
          </Button>
        </div>
      )}

      {/* Android guide inline expand */}
      {showAndroidGuide && (
        <div className="p-4 rounded-xl bg-warning/5 border border-warning/20">
          <AndroidInstallGuide />
          <Button
            size="sm"
            variant="outline"
            className="mt-3"
            onClick={() => setShowAndroidGuide(false)}
          >
            {t("common.close", "Close")}
          </Button>
        </div>
      )}

      {/* Email reminder toast */}
      {emailReminderSent && (
        <p className="text-xs text-muted-foreground flex items-center gap-1 px-1">
          <Mail className="h-3 w-3" />
          {t("pwa.banner.emailSent", "We emailed you a link to install on your phone.")}
        </p>
      )}

      {/* Send to Phone modal (desktop) */}
      <SendToPhoneModal
        isOpen={showSendToPhone}
        onClose={() => setShowSendToPhone(false)}
        userEmail={userEmail}
      />
    </>
  );
};
