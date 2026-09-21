import React, { useState, useEffect, useCallback } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Globe, Watch, Shield, HeartPulse, Smartphone, Lock, Eye, EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [pin, setPin] = useState("");
  const [pinSet, setPinSet] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pinError, setPinError] = useState("");
  const [pinVisible, setPinVisible] = useState(false);

  // Simple hash for PIN storage (not cryptographic — for passcode lock only)
  const hashPin = (p: string): string => {
    let h = 0;
    for (let i = 0; i < p.length; i++) {
      h = ((h << 5) - h + p.charCodeAt(i)) | 0;
    }
    return Math.abs(h).toString(36);
  };

  // Load PIN from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("fb_parent_pin");
      if (stored) { setPinSet(true); }
    } catch {}
  }, []);

  // Visibility change — lock the dashboard when PWA returns from background
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === "visible" && pinSet) {
        setShowPinDialog(true);
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [pinSet]);

  const handleSetPin = () => {
    if (pin.length < 4) { setPinError("PIN must be at least 4 digits."); return; }
    try {
      localStorage.setItem("fb_parent_pin", hashPin(pin));
      setPinSet(true);
      setPinError("");
    } catch {}
  };

  const handlePinVerify = () => {
    if (!pinSet) { setShowPinDialog(false); return; }
    try {
      const stored = localStorage.getItem("fb_parent_pin");
      if (stored === hashPin(pinInput)) {
        setPinError("");
        setShowPinDialog(false);
      } else {
        setPinError("Incorrect PIN.");
      }
    } catch {
      setPinError("Verification failed.");
    }
  };

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

          {/* Parental PIN Lock */}
          <div className="border-t pt-4">
            <div className="space-y-0.5 flex items-center gap-3">
              <Lock className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label className="font-semibold">{t("profile.pinLockTitle", "Parent PIN Lock")}</Label>
                <p className="text-sm text-muted-foreground">{t("profile.pinLockDesc", "Protect parent settings with a PIN when the app returns from background")}</p>
              </div>
            </div>
            {pinSet ? (
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => { setShowPinDialog(true); setPinInput(""); setPinError(""); }}
              >
                {t("profile.verifyPin", "Verify PIN to access settings")}
              </Button>
            ) : (
              <div className="mt-2 space-y-2">
                <div className="flex gap-2">
                  <Input
                    type={pinVisible ? "text" : "password"}
                    placeholder="4+ digit PIN"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="h-10 text-sm font-mono"
                    maxLength={6}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setPinVisible(!pinVisible)}
                  >
                    {pinVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <Button size="sm" onClick={handleSetPin} className="w-full">
                  {t("profile.setPin", "Set PIN")}
                </Button>
              </div>
            )}
          </div>
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

      {/* ── PIN Lock Dialog ── */}
      <Dialog open={showPinDialog} onOpenChange={(open) => { if (!open) setShowPinDialog(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              {t("profile.pinLockTitle", "Parent PIN Lock")}
            </DialogTitle>
            <DialogDescription>
              {t("profile.pinEnterDesc", "Enter your PIN to access parent settings")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              type={pinVisible ? "text" : "password"}
              placeholder="PIN"
              value={pinInput}
              onChange={(e) => { setPinInput(e.target.value); setPinError(""); }}
              className="h-12 text-xl font-mono text-center tracking-[0.5em]"
              maxLength={6}
            />
            {pinError && <p className="text-sm text-destructive">{pinError}</p>}
            <Button onClick={handlePinVerify} className="w-full">
              {t("profile.verifyPin", "Verify")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
