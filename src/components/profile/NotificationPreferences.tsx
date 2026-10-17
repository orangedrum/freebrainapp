/**
 * NotificationPreferences — role-specific notification toggle panel.
 *
 * Renders channel toggles (in-app, push, email) + granular toggles
 * specific to the user's role. Persists to localStorage via
 * `notificationPreferences.ts` (Tier 1 — per-device, instant access).
 *
 * Modular: self-contained, receives userId + role as props.
 * i18n: all strings via `t("notifications.*")`.
 */

import React, { useState, useEffect, useCallback } from "react";
import { Bell, Smartphone, Mail, Monitor, Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  setNotificationPrefs,
  ROLE_TOGGLE_DEFS,
  type NotificationPrefs,
  type NotificationChannel,
} from "@/lib/notificationPreferences";
import { hydrateNotificationPrefs, persistNotificationPrefs } from "@/lib/notificationPrefsSync";
import { subscribePush, unsubscribePush, getPushState } from "@/lib/pushSubscriptions";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface NotificationPreferencesProps {
  userId: string;
  role: string;
}

export const NotificationPreferences: React.FC<NotificationPreferencesProps> = ({ userId, role }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [pushBusy, setPushBusy] = useState(false);
  // A supporter can open their FreeBrainer's preferences (proxy editing). Push
  // is a DEVICE setting: it must only be reconciled against the owner's own
  // browser. Checking it on the supporter's device would wrongly flip the
  // FreeBrainer's push off (and could subscribe the supporter's device as the
  // FreeBrainer). Only touch device push state when the editor owns the row.
  const isSelf = !!user?.id && user.id === userId;

  // Load prefs on mount (and when user/role changes). The server row (if any)
  // is merged in first so a toggle set on another device is honored. A push
  // toggle is the user's INTENT, not a mirror of this device: a merely missing
  // subscription is recoverable — autoResubscribeIfNeeded() silently restores
  // it on login. So we only clear the intent on a HARD block (permission
  // revoked / browser can't push). Never flip it off just because this browser
  // has no subscription — doing so would permanently disarm auto-resubscribe
  // (which requires push === true) and would also clobber other devices.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const stored = await hydrateNotificationPrefs(userId, role);
      if (cancelled) return;
      setPrefs(stored);
      if (!isSelf || !stored.channels.push) return;
      try {
        const state = await getPushState();
        if (cancelled) return;
        if (state !== "denied" && state !== "unsupported") return;
        setPrefs((prev) => {
          if (!prev || !prev.channels.push) return prev;
          const next = { ...prev, channels: { ...prev.channels, push: false } };
          setNotificationPrefs(userId, next);
          void persistNotificationPrefs(userId, role, next);
          return next;
        });
      } catch {
        /* push state unavailable — leave the stored value */
      }
    })();
    return () => { cancelled = true; };
  }, [userId, role, isSelf]);

  // Persist whenever prefs change (but not on first null state)
  const updatePrefs = useCallback(
    (next: NotificationPrefs) => {
      setPrefs(next);
      setNotificationPrefs(userId, next);
      void persistNotificationPrefs(userId, role, next);
    },
    [userId, role]
  );

  const toggleChannel = async (channel: NotificationChannel, value: boolean) => {
    if (!prefs) return;
    // Push ON means a real browser subscription (permission + VAPID +
    // push_subscriptions row). If that fails (denied/unsupported), leave the
    // toggle OFF and say why instead of a dead toggle. ONLY for the owner:
    // a supporter editing a FreeBrainer's prefs must not subscribe their own
    // device as the FreeBrainer.
    if (channel === "push" && isSelf) {
      if (value) {
        setPushBusy(true);
        try {
          const ok = await subscribePush(userId);
          if (!ok) {
            toast({
              title: t("notifications.pushFailed", "Couldn't enable push"),
              description: t(
                "notifications.pushFailedDesc",
                "Permission was denied or this browser can't receive pushes. In-app notifications still work."
              ),
              variant: "destructive",
            });
            return;
          }
        } finally {
          setPushBusy(false);
        }
      } else {
        await unsubscribePush(userId);
      }
    }
    updatePrefs({
      ...prefs,
      channels: { ...prefs.channels, [channel]: value },
    });
  };

  const toggleGranular = (key: string, value: boolean) => {
    if (!prefs) return;
    updatePrefs({
      ...prefs,
      toggles: { ...prefs.toggles, [key]: value },
    });
  };

  if (!prefs) return null;

  const toggleDefs = ROLE_TOGGLE_DEFS[role] || [];

  // Channel metadata for rendering
  const channels: { key: NotificationChannel; icon: React.ReactNode; labelKey: string; descKey: string }[] = [
    { key: "inApp", icon: <Monitor className="h-4 w-4" />, labelKey: "channelInApp", descKey: "channelInAppDesc" },
    { key: "push", icon: <Smartphone className="h-4 w-4" />, labelKey: "channelPush", descKey: "channelPushDesc" },
    { key: "email", icon: <Mail className="h-4 w-4" />, labelKey: "channelEmail", descKey: "channelEmailDesc" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          {t("notifications.title", "Notification Preferences")}
        </CardTitle>
        <CardDescription>
          {t("notifications.subtitle", "Choose how and when you want to be notified.")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* ── Channel Toggles ── */}
        <div className="space-y-3">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("notifications.channelsSection", "Delivery Channels")}
          </Label>
          {channels.map((ch) => (
            <div key={ch.key} className="flex items-center justify-between">
              <div className="space-y-0.5 flex items-center gap-3">
                <span className="text-muted-foreground">{ch.icon}</span>
                <div>
                  <Label className="font-semibold text-sm">
                    {t(`notifications.${ch.labelKey}`, ch.labelKey)}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t(`notifications.${ch.descKey}`, ch.descKey)}
                  </p>
                </div>
              </div>
              <Switch
                checked={prefs.channels[ch.key]}
                disabled={ch.key === "push" && pushBusy}
                onCheckedChange={(val) => toggleChannel(ch.key, val)}
              />
            </div>
          ))}
        </div>

        {/* ── Granular Toggles (role-specific) ── */}
        {toggleDefs.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("notifications.granularSection", "What You're Notified About")}
              </Label>
              {toggleDefs.map((def) => (
                <div key={def.key} className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="font-semibold text-sm">
                      {t(`notifications.toggles.${def.labelKey}`, def.labelKey)}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t(`notifications.toggles.${def.labelKey}Desc`, "")}
                    </p>
                  </div>
                  <Switch
                    checked={prefs.toggles[def.key] ?? true}
                    onCheckedChange={(val) => toggleGranular(def.key, val)}
                  />
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── Info Note ── */}
        <Separator />
        <div className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <p>{t("notifications.privacyNote", "Your notification preferences are stored on this device only and do not sync across devices.")}</p>
        </div>
      </CardContent>
    </Card>
  );
};
