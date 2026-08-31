/**
 * WearableSection — reusable wearable/device connection card.
 *
 * Reuses the same explanation text + ConnectDeviceModal from onboarding.
 * Shows a prominent connect button when not connected, and a
 * connected status with disconnect option when already linked.
 *
 * Tier 1: device connection state stored in localStorage via
 * `symptomStorage.setDeviceConnected()`.
 */
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Watch, Smartphone, RefreshCw, ShieldCheck, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ConnectDeviceModal } from "@/components/profile/ConnectDeviceModal";

interface WearableSectionProps {
  wearableConnected: boolean;
  onConnectedChange: (connected: boolean) => void;
}

export function WearableSection({ wearableConnected, onConnectedChange }: WearableSectionProps) {
  const { t } = useTranslation();
  const [showConnectModal, setShowConnectModal] = useState(false);

  const isIOS =
    typeof window !== "undefined" &&
    /iphone|ipad|ipod|mac/.test(navigator.userAgent.toLowerCase());

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Watch className="h-5 w-5 text-primary" />
          {t("profile.wearableSectionTitle", "Wearable & Device Sync")}
        </CardTitle>
        <CardDescription>
          {t("onboarding.step10.desc", "Automatically log your movement days without having to open the app.")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection status */}
        {wearableConnected ? (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-success/10 border border-success/30">
            <CheckCircle2 className="h-6 w-6 text-success shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-sm">
                {isIOS ? t("device.appleHealthWatch") : t("device.googleHealthConnect")}
              </p>
              <p className="text-xs text-muted-foreground">{t("device.autoSync")}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-destructive/10"
              onClick={() => onConnectedChange(false)}
            >
              {t("common.cancel", "Disconnect")}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full h-16 justify-start px-4 border-2 hover:border-primary hover:bg-primary/5"
              onClick={() => setShowConnectModal(true)}
            >
              {isIOS ? (
                <Watch className="h-8 w-8 mr-4 text-primary shrink-0" />
              ) : (
                <Smartphone className="h-8 w-8 mr-4 text-primary shrink-0" />
              )}
              <span className="text-lg font-semibold">
                {isIOS ? t("device.appleHealth") : t("device.googleFit")}
              </span>
            </Button>
            <Button
              variant="outline"
              className="w-full h-16 justify-start px-4 border-2 hover:border-primary hover:bg-primary/5"
              onClick={() => setShowConnectModal(true)}
            >
              <RefreshCw className="h-8 w-8 mr-4 text-primary shrink-0" />
              <span className="text-lg font-semibold">{t("device.otherDevice")}</span>
            </Button>
          </div>
        )}

        {/* Privacy badge */}
        <div className="p-3 rounded-xl bg-muted/30 border flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
          <ShieldCheck className="h-4 w-4 text-success shrink-0 mt-0.5" />
          <span>{t("device.onDeviceDesc")}</span>
        </div>
      </CardContent>

      <ConnectDeviceModal
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
        onConnected={() => onConnectedChange(true)}
      />
    </Card>
  );
}
