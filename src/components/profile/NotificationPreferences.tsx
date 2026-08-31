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
  getNotificationPrefs,
  setNotificationPrefs,
  ROLE_TOGGLE_DEFS,
  type NotificationPrefs,
  type NotificationChannel,
} from "@/lib/notificationPreferences";

interface NotificationPreferencesProps {
  userId: string;
  role: string;
}

export const NotificationPreferences: React.FC<NotificationPreferencesProps> = ({ userId, role }) => {
  const { t } = useTranslation();
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);

  // Load prefs on mount (and when user/role changes)
  useEffect(() => {
    if (userId) {
      setPrefs(getNotificationPrefs(userId, role));
    }
  }, [userId, role]);

  // Persist whenever prefs change (but not on first null state)
  const updatePrefs = useCallback(
    (next: NotificationPrefs) => {
      setPrefs(next);
      setNotificationPrefs(userId, next);
    },
    [userId]
  );

  const toggleChannel = (channel: NotificationChannel, value: boolean) => {
    if (!prefs) return;
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
