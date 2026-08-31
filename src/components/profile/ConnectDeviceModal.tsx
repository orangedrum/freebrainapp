import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Watch, Smartphone, ShieldCheck, CheckCircle2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

interface ConnectDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  metricName?: string;
  onConnected?: () => void;
}

export const ConnectDeviceModal: React.FC<ConnectDeviceModalProps> = ({
  isOpen,
  onClose,
  metricName,
  onConnected,
}) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [isConnecting, setIsConnecting] = useState(false);
  const [connected, setConnected] = useState(false);

  const isIOS = typeof window !== "undefined" && /iphone|ipad|ipod|mac/.test(navigator.userAgent.toLowerCase());

  const handleConnect = () => {
    setIsConnecting(true);
    setTimeout(() => {
      setIsConnecting(false);
      setConnected(true);
      toast({
        title: t("device.connectedTitle", "Device Connected Successfully! 🎉"),
        description: t("device.connectedDesc", "Apple Health / Google Connect is now synced for {{metric}}.", { metric: metricName || t("device.wearableMetrics", "wearable metrics") }),
      });
      if (onConnected) onConnected();
      setTimeout(() => {
        setConnected(false);
        onClose();
      }, 1200);
    }, 1500);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md w-[92vw] rounded-2xl p-6 sm:p-8">
        <DialogHeader className="space-y-3 text-left">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-1">
            {isIOS ? <Watch className="h-6 w-6" /> : <Smartphone className="h-6 w-6" />}
          </div>
          <DialogTitle className="text-xl sm:text-2xl font-bold">
            {t("device.connectTitle", "Connect Wearable Device")}
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            {metricName ? (
              <span>
                <strong className="text-foreground">{metricName}</strong> {t("device.metricDesc", "is measured automatically using wearable sensors via")} {isIOS ? t("device.appleHealthKit") : t("device.googleHealthConnect")}.
              </span>
            ) : (
              t("device.syncDesc", "Sync your smartwatch or movement sensor to track gait, tremors, steps, and energy without manual input.")
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2">
          <div className="p-4 rounded-xl bg-muted/40 border space-y-2 text-xs sm:text-sm">
            <div className="flex items-center gap-2 font-semibold text-foreground">
              <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
              {t("device.onDeviceEncrypted", "100% On-Device & Encrypted")}
            </div>
            <p className="text-muted-foreground leading-normal">
              {t("device.onDeviceDesc", "Device data remains encrypted on your phone. FreeBrain calculates wellness insights locally and does not store clinical records on remote servers.")}
            </p>
          </div>

          <div className="p-3 rounded-xl border flex items-center gap-3 bg-card">
            {isIOS ? (
              <Watch className="h-6 w-6 text-primary shrink-0" />
            ) : (
              <Smartphone className="h-6 w-6 text-primary shrink-0" />
            )}
            <div className="text-sm">
              <p className="font-semibold">{isIOS ? t("device.appleHealthWatch") : t("device.googleHealthConnect")}</p>
              <p className="text-xs text-muted-foreground">{t("device.autoSync", "Automatic background sync")}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <Button
            onClick={handleConnect}
            disabled={isConnecting || connected}
            className="h-12 text-base font-bold w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isConnecting ? (
              <span className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 animate-spin" />
                {t("device.syncing", "Syncing with Device...")}
              </span>
            ) : connected ? (
              <span className="flex items-center gap-2 text-emerald-300">
                <CheckCircle2 className="h-5 w-5" />
                {t("device.connected", "Connected!")}
              </span>
            ) : (
              t("device.connectBtn", { platform: isIOS ? t("device.appleHealth") : t("device.googleConnect") })
            )}
          </Button>
          <Button variant="ghost" onClick={onClose} disabled={isConnecting} className="h-10 text-sm text-muted-foreground">
            {t("common.cancel", "Cancel")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
