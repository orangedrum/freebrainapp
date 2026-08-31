import React, { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Globe, Watch, Shield, HeartPulse, Smartphone } from "lucide-react";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { changeLanguage, getCurrentLanguage } from "@/lib/language";
import { useAuth } from "@/contexts/AuthContext";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { SendToPhoneModal } from "@/components/shared/SendToPhoneModal";
import { IOSInstallGuide } from "@/components/shared/IOSInstallGuide";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface ProfileSettingsProps {
  wearableConnected?: boolean;
  setWearableConnected?: (val: boolean) => void;
  shareConsent: boolean;
  setShareConsent: (val: boolean) => void;
  /** @deprecated — language is now read from i18n via getCurrentLanguage() */
  locale?: string;
  /** @deprecated — use changeLanguage() from @/lib/language instead */
  setLocale?: (val: string) => void;
  isBrainLover?: boolean;
  selectedPatientName?: string;
  patientWearableConnected?: boolean;
  setPatientWearableConnected?: (val: boolean) => void;
  patientShareConsent?: boolean;
  setPatientShareConsent?: (val: boolean) => void;
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({
  wearableConnected,
  setWearableConnected,
  shareConsent,
  setShareConsent,
  isBrainLover = false,
  selectedPatientName,
  patientWearableConnected = false,
  setPatientWearableConnected,
  patientShareConsent = false,
  setPatientShareConsent,
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [currentLang, setCurrentLang] = useState(getCurrentLanguage());
  const pwa = usePWAInstall();
  const [showSendToPhone, setShowSendToPhone] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // Keep dropdown in sync with i18n runtime changes (from any switcher)
  useEffect(() => {
    const handler = (lng: string) => setCurrentLang(lng.split("-")[0]);
    i18n.on("languageChanged", handler);
    return () => i18n.off("languageChanged", handler);
  }, []);

  const handleLanguageChange = (lang: string) => {
    setCurrentLang(lang);
    changeLanguage(lang, user?.id);
  };

  const handleInstallClick = async () => {
    if (pwa.platform === "android" && pwa.canInstall) {
      await pwa.promptInstall();
    } else if (pwa.platform === "ios") {
      setShowIOSGuide(true);
    } else {
      setShowSendToPhone(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Primary Preferences Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            {t("profile.languageCardTitle", "Language & App Settings")}
          </CardTitle>
          <CardDescription>{t("profile.preferencesSubtitle", "Manage your display language and app settings.")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Language Selection */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5 flex items-center gap-3">
              <Globe className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label className="font-semibold">{t("profile.language", "App Language")}</Label>
                <p className="text-sm text-muted-foreground">{t("profile.languageSubtitle", "Select your primary display language")}</p>
              </div>
            </div>
            <select
              value={currentLang}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="bg-background border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
              <option value="pt">Português</option>
          </select>
        </div>

        {/* PWA Install Failsafe — always available, never nags */}
        {!pwa.isInstalled && (
          <div className="flex items-center justify-between border-t pt-4">
            <div className="space-y-0.5 flex items-center gap-3">
              <Smartphone className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label className="font-semibold">{t("pwa.profile.installTitle", "Add to Home Screen")}</Label>
                <p className="text-sm text-muted-foreground">{t("pwa.profile.installDesc", "Get the app experience on your phone")}</p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={handleInstallClick} className="gap-2">
              <Smartphone className="h-4 w-4" />
              {t("pwa.profile.installButton", "Install")}
            </Button>
          </div>
        )}

          {/* FreeBrainer settings: Share consent + disclaimer (wearable handled by WearableSection) */}
          {!isBrainLover && (
            <>
              {/* Community Share / HIPAA Consent */}
              <div className="flex items-center justify-between border-t pt-4">
                <div className="space-y-0.5 flex items-center gap-3">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label className="font-semibold">{t("profile.communityShare", "Share Activity to Community Wall")}</Label>
                    <p className="text-sm text-muted-foreground">{t("profile.communityShareDesc", "Allow squad members to see check-in streaks (HIPAA Compliant)")}</p>
                  </div>
                </div>
                <Switch checked={shareConsent} onCheckedChange={setShareConsent} />
              </div>

              {/* Medical & Wellness Disclaimer */}
              <div className="border-t pt-4 text-xs text-muted-foreground leading-relaxed">
                <span className="font-semibold text-foreground">{t("profile.disclaimerTitle", "General Wellness Disclaimer:")}</span> {t("profile.disclaimerText", "FreeBrain is a fitness and movement habit tracker for wellness and community support. It is not a medical device, diagnostic tool, or clinical record keeper.")}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Standalone FreeBrainer Settings Assistance Section for BrainLovers */}
      {isBrainLover && setPatientWearableConnected && setPatientShareConsent && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-primary flex items-center gap-2">
              <HeartPulse className="h-5 w-5 text-primary" />
              {t("profile.assistanceTitle", "FreeBrainer Settings Assistance")}
            </CardTitle>
            <CardDescription className="text-foreground/80 font-medium">
              {t("profile.assisting", "Assisting:")} <span className="font-bold text-primary">{selectedPatientName || t("profile.freeBrainerFallback", "FreeBrainer")}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Wearable Connection for FreeBrainer */}
            <div className="flex items-center justify-between bg-card p-4 rounded-lg border">
              <div className="space-y-0.5 flex items-center gap-3">
                <Watch className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Label className="font-semibold">{t("profile.wearableSync", "Sync Wearable / Apple Health")}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t("profile.manageWearableFor", { name: selectedPatientName || t("profile.freeBrainerFallback", "FreeBrainer"), defaultValue: "Manage wearable integration for {{name}}" })}
                  </p>
                </div>
              </div>
              <Switch checked={patientWearableConnected} onCheckedChange={setPatientWearableConnected} />
            </div>

            {/* Community Share / HIPAA Consent for FreeBrainer */}
            <div className="flex items-center justify-between bg-card p-4 rounded-lg border">
              <div className="space-y-0.5 flex items-center gap-3">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Label className="font-semibold">{t("profile.shareActivityHipaa", "Share Activity & HIPAA Settings")}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t("profile.allowWallSharing", { name: selectedPatientName || t("profile.freeBrainerFallback", "FreeBrainer"), defaultValue: "Allow {{name}} check-in streaks on Community Wall" })}
                  </p>
                </div>
              </div>
              <Switch checked={patientShareConsent} onCheckedChange={setPatientShareConsent} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── PWA Install modals (failsafe) ── */}
      <SendToPhoneModal
        isOpen={showSendToPhone}
        onClose={() => setShowSendToPhone(false)}
        userEmail={user?.email || ""}
      />
      <Dialog open={showIOSGuide} onOpenChange={(open) => !open && setShowIOSGuide(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              {t("pwa.ios.guideTitle", "Add to Home Screen")}
            </DialogTitle>
            <DialogDescription>
              {t("pwa.ios.guideSubtitle", "Follow these 3 steps to add FreeBrain to your phone.")}
            </DialogDescription>
          </DialogHeader>
          <IOSInstallGuide />
        </DialogContent>
      </Dialog>
    </div>
  );
};
