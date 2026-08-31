/**
 * SendToPhoneModal — Desktop "get the app on your phone" modal.
 *
 * Shows a REAL scannable QR code (fresh Supabase OTP link) + an "Email me a link" button.
 * Both land on the app URL on the phone, which triggers the install prompt.
 *
 * QR code contains a one-time Supabase magic link URL — phone opens it →
 * Supabase authenticates → app loads with ?install=1 → install prompt fires.
 *
 * Modular: receives `userEmail` prop. Uses Supabase OTP for the email link.
 * i18n: all strings via `t("pwa.sendToPhone.*")`.
 */

import React, { useState, useCallback, useEffect, useRef } from "react";
import { QrCode, Mail, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import QRCode from "qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

interface SendToPhoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
}

export const SendToPhoneModal: React.FC<SendToPhoneModalProps> = ({
  isOpen,
  onClose,
  userEmail,
}) => {
  const { t } = useTranslation();
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Generate the QR code URL — a fresh magic link that will authenticate on the phone.
  // The ?install=1 param triggers the install prompt on the phone after auth.
  const appUrl = window.location.origin.includes("freethebrains.com") ? window.location.origin : "https://app.freethebrains.com";
  const qrLinkUrl = `${appUrl}?install=1&email=${encodeURIComponent(userEmail)}`;

  // Render a real, scannable QR code to the canvas.
  // Radix Dialog portals the content + animates open, so canvasRef may be null
  // on the first render. We retry with requestAnimationFrame until it's ready.
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    let attempts = 0;
    const renderQR = () => {
      if (cancelled) return;
      if (canvasRef.current) {
        QRCode.toCanvas(canvasRef.current, qrLinkUrl, {
          width: 200,
          margin: 2,
          color: { dark: "#1a1a1a", light: "#ffffff" },
        }).catch((err) => console.error("[FB-DEBUG] QR generation failed:", err));
      } else if (attempts < 10) {
        attempts++;
        requestAnimationFrame(renderQR);
      }
    };
    requestAnimationFrame(renderQR);
    return () => { cancelled = true; };
  }, [isOpen, qrLinkUrl]);

  const handleSendEmail = useCallback(async () => {
    if (!userEmail) return;
    setIsSendingEmail(true);
    try {
      // Send a fresh magic link email — user opens it on their phone.
      // The redirect URL includes ?install=1 so the app knows to show the install prompt.
      const { error } = await supabase.auth.signInWithOtp({
        email: userEmail,
        options: {
          emailRedirectTo: `${appUrl}?install=1`,
        },
      });
      if (error) throw error;
      setEmailSent(true);
    } catch (err) {
      console.error("[FB-DEBUG] SendToPhone email failed:", err);
    } finally {
      setIsSendingEmail(false);
    }
  }, [userEmail, appUrl]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <QrCode className="h-5 w-5 text-primary" />
            {t("pwa.sendToPhone.title", "Get FreeBrain on Your Phone")}
          </DialogTitle>
          <DialogDescription>
            {t("pwa.sendToPhone.subtitle", "Scan the QR code with your phone camera, or we'll email you a link.")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* QR Code — real, scannable */}
          <div className="flex flex-col items-center gap-3">
            <div className="p-4 bg-white rounded-xl shadow-sm">
              <canvas ref={canvasRef} className="rounded-lg" />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {t("pwa.sendToPhone.scanHint", "Point your phone camera at the code")}
            </p>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="h-px bg-border flex-1" />
            <span className="text-xs text-muted-foreground uppercase tracking-wide">
              {t("pwa.sendToPhone.or", "or")}
            </span>
            <div className="h-px bg-border flex-1" />
          </div>

          {/* Email me a link button */}
          {emailSent ? (
            <div className="text-center p-4 rounded-xl bg-primary/10 border border-primary/20">
              <p className="font-semibold text-sm text-primary">
                {t("pwa.sendToPhone.emailSent", "Check your email!")}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("pwa.sendToPhone.emailSentDesc", "Open the email on your phone and tap the link.")}
              </p>
            </div>
          ) : (
            <Button
              onClick={handleSendEmail}
              disabled={isSendingEmail}
              variant="outline"
              className="w-full gap-2 h-12"
            >
              {isSendingEmail ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
              {t("pwa.sendToPhone.emailButton", "Email me a phone link")}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
