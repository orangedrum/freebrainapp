import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tv, Cast, Smartphone, ExternalLink, Monitor } from "lucide-react";

interface CastToTVModalProps {
  open: boolean;
  onClose: () => void;
  /** YouTube video ID — used for the "Open in YouTube" fallback deep-link */
  videoId?: string;
}

/**
 * CastToTVModal — Platform-aware casting instructions that work inside a PWA.
 *
 * The core problem: PWAs run in "standalone" mode with no browser chrome,
 * so there's no ⋮ menu → Cast option. We use two approaches:
 *
 * PRIMARY — System screen mirroring:
 *   Android: Quick Settings → "Cast" / "Screen Cast" / "Smart View"
 *   iOS:     Control Center → Screen Mirroring
 *   This mirrors the entire phone screen to the TV. User returns to
 *   FreeBrain and plays the video — it appears on the TV.
 *
 * FALLBACK — "Open in YouTube":
 *   Deep-links to the native YouTube app (vnd.youtube://) where Google's
 *   built-in cast button is reliable. Falls back to youtube.com if the
 *   app isn't installed. Briefly leaves FreeBrain, but the check-in flow
 *   resumes when they return.
 *
 * The YouTube iframe also has cast:1 enabled — if Google decides to show
 * a cast button in the embed, that's a bonus, but we don't rely on it.
 */
export const CastToTVModal: React.FC<CastToTVModalProps> = ({ open, onClose, videoId }) => {
  const { t } = useTranslation();
  const [platform] = useState<"ios" | "android" | "desktop">(() => {
    const ua = navigator.userAgent || "";
    if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) return "ios";
    if (/Android/i.test(ua)) return "android";
    return "desktop";
  });

  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true;

  /** Open the native YouTube app (or youtube.com fallback) */
  const openInYouTube = () => {
    if (!videoId) return;
    // Try native app deep-link, fall back to web
    const nativeUrl = `vnd.youtube://watch?v=${videoId}`;
    const webUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // On desktop, just open the web URL
    if (platform === "desktop") {
      window.open(webUrl, "_blank");
      return;
    }

    // On mobile, try the native app first
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = nativeUrl;
    document.body.appendChild(iframe);

    // If the app didn't open in 1.5s, fall back to web
    setTimeout(() => {
      document.body.removeChild(iframe);
      window.open(webUrl, "_blank");
    }, 1500);
  };

  // ── Desktop ──
  if (platform === "desktop") {
    return (
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="rounded-full bg-primary/15 p-2">
                <Monitor className="h-5 w-5 text-primary" />
              </div>
              <DialogTitle>{t("cast.title", "Cast to Your TV")}</DialogTitle>
            </div>
            <DialogDescription>
              {t("cast.desktopDesc", "Watch on the big screen while you move.")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                1
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{t("cast.desktopStep1", "Use Chrome's cast feature")}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("cast.desktopStep1Desc", "Click the three dots ⋮ in Chrome's top-right corner, then select \"Cast\".")}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                2
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{t("cast.desktopStep2", "Select your TV")}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("cast.desktopStep2Desc", "Choose your Chromecast or smart TV from the list.")}
                </p>
              </div>
            </div>
          </div>

          {videoId && (
            <Button variant="outline" onClick={openInYouTube} className="w-full gap-2">
              <ExternalLink className="h-4 w-4" />
              {t("cast.openInYouTube", "Open in YouTube instead")}
            </Button>
          )}

          <Button onClick={onClose} className="w-full">
            {t("cast.gotIt", "Got it")}
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  // ── Android — System Screen Mirroring (works in PWA) ──
  if (platform === "android") {
    return (
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="rounded-full bg-primary/15 p-2">
                <Cast className="h-5 w-5 text-primary" />
              </div>
              <DialogTitle>{t("cast.title", "Cast to Your TV")}</DialogTitle>
            </div>
            <DialogDescription>
              {t("cast.androidDesc", "Mirror your screen to watch on the big screen.")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Step 1 */}
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                1
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{t("cast.androidStep1", "Swipe down for Quick Settings")}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("cast.androidStep1Desc", "Swipe down from the very top of your screen to open Quick Settings.")}
                </p>
                <div className="mt-2 flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2">
                  <Smartphone className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium text-primary">
                    {t("cast.androidSwipeHint", "Swipe down from the top edge")}
                  </span>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                2
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{t("cast.androidStep2", 'Tap "Cast" or "Screen Cast"')}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
{t("cast.androidStep2Desc", 'Look for the Cast button (a screen with waves). On Samsung, it may say "Smart View".')}
                </p>
                <div className="mt-2 flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2">
                  <Cast className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium text-primary">
                    {t("cast.castIconExample", "This icon")}
                  </span>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                3
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{t("cast.androidStep3", "Select your TV")}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("cast.androidStep3Desc", "Choose your Chromecast or smart TV from the list.")}
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                4
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{t("cast.androidStep4", "Come back and press play")}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
{t("cast.androidStep4Desc", 'Return to FreeBrain and tap "Start Moving" — your screen is now mirrored to the TV.')}
                </p>
              </div>
            </div>
          </div>

          {videoId && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-2 text-center">
                {t("cast.fallbackHint", "Can't find the cast button?")}
              </p>
              <Button variant="outline" onClick={openInYouTube} className="w-full gap-2">
                <ExternalLink className="h-4 w-4" />
                {t("cast.openInYouTube", "Open in YouTube app")}
              </Button>
            </div>
          )}

          <Button onClick={onClose} className="w-full">
            {t("cast.gotIt", "Got it")}
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  // ── iOS / Safari — Screen Mirroring ──
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="rounded-full bg-primary/15 p-2">
              <Tv className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle>{t("cast.title", "Cast to Your TV")}</DialogTitle>
          </div>
          <DialogDescription>
            {t("cast.iosDesc", "Mirror your screen to watch on the big screen.")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Step 1 */}
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
              1
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">
                {t("cast.iosStep1", "Open Control Center")}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("cast.iosStep1Desc", "Swipe down from the top-right corner of your screen.")}
              </p>
              <div className="mt-2 flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2">
                <Smartphone className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium text-primary">
                  {t("cast.iosSwipeHint", "Swipe down from top-right")}
                </span>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
              2
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">
                {t("cast.iosStep2", "Tap “Screen Mirroring”")}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("cast.iosStep2Desc", "Look for the two overlapping rectangles icon.")}
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
              3
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">
                {t("cast.iosStep3", "Select your TV")}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("cast.iosStep3Desc", "Choose your Apple TV or AirPlay-compatible TV.")}
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
              4
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">
                {t("cast.iosStep4", "Come back and press play")}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
{t("cast.iosStep4Desc", 'Return to FreeBrain and tap "Start Moving" to begin.')}
              </p>
            </div>
          </div>
        </div>

        {videoId && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-2 text-center">
              {t("cast.fallbackHint", "Can't find the mirroring button?")}
            </p>
            <Button variant="outline" onClick={openInYouTube} className="w-full gap-2">
              <ExternalLink className="h-4 w-4" />
              {t("cast.openInYouTube", "Open in YouTube app")}
            </Button>
          </div>
        )}

        <Button onClick={onClose} className="w-full">
          {t("cast.gotIt", "Got it")}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default CastToTVModal;
