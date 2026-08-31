/**
 * Notification Preferences — Tier 1 (localStorage)
 *
 * Per-device notification toggle preferences. These are UI/UX preferences
 * (not sensitive health data), but we keep them in localStorage for simplicity
 * and instant access — no need for cross-device sync on v1.
 *
 * Each role gets its own set of toggle keys. Defaults: all in-app + push ON,
 * email OFF (to avoid spamming new users).
 *
 * Two-tier compliance: No health data here — purely notification channel preferences.
 */

export type NotificationChannel = "inApp" | "push" | "email";

export interface NotificationPrefs {
  /** Master channel toggles */
  channels: Record<NotificationChannel, boolean>;
  /** Role-specific granular toggles (e.g. "pokes", "cheers", "sosAlerts") */
  toggles: Record<string, boolean>;
}

const STORAGE_KEY_PREFIX = "fb_notification_prefs_";

// ── Role-specific toggle definitions ──────────────────────────

export interface ToggleDef {
  key: string;
  /** i18n key under `notifications.toggles.<key>` */
  labelKey: string;
}

export const ROLE_TOGGLE_DEFS: Record<string, ToggleDef[]> = {
  freebrainer: [
    { key: "pokes", labelKey: "pokes" },
    { key: "cheers", labelKey: "cheers" },
    { key: "videoRecommendations", labelKey: "videoRecommendations" },
    { key: "sosAlerts", labelKey: "sosAlerts" },
    { key: "teamRallies", labelKey: "teamRallies" },
    { key: "sessionReminders", labelKey: "sessionReminders" },
    { key: "checkinReminders", labelKey: "checkinReminders" },
    { key: "rankChanges", labelKey: "rankChanges" },
  ],
  brainlover: [
    { key: "freebrainerCheckins", labelKey: "freebrainerCheckins" },
    { key: "freebrainerSOS", labelKey: "freebrainerSOS" },
    { key: "freebrainerStreaks", labelKey: "freebrainerStreaks" },
    { key: "sessionReminders", labelKey: "sessionReminders" },
    { key: "rankChanges", labelKey: "rankChanges" },
    { key: "teamRallies", labelKey: "teamRallies" },
  ],
  pro: [
    { key: "freebrainerCheckins", labelKey: "freebrainerCheckins" },
    { key: "freebrainerSOS", labelKey: "freebrainerSOS" },
    { key: "freebrainerStreaks", labelKey: "freebrainerStreaks" },
    { key: "sessionReminders", labelKey: "sessionReminders" },
    { key: "rankChanges", labelKey: "rankChanges" },
    { key: "rosterUpdates", labelKey: "rosterUpdates" },
  ],
  admin: [
    { key: "systemAlerts", labelKey: "systemAlerts" },
    { key: "newUsers", labelKey: "newUsers" },
    { key: "communityReports", labelKey: "communityReports" },
  ],
};

/** Default: in-app ON, push ON, email OFF */
const DEFAULT_CHANNELS: Record<NotificationChannel, boolean> = {
  inApp: true,
  push: true,
  email: false,
};

function defaultToggles(role: string): Record<string, boolean> {
  const defs = ROLE_TOGGLE_DEFS[role] || [];
  const result: Record<string, boolean> = {};
  for (const def of defs) {
    result[def.key] = true; // all toggles ON by default
  }
  return result;
}

/**
 * Get notification preferences for a user + role.
 * Migrates/validates old or corrupt data (self-heal rule).
 */
export function getNotificationPrefs(userId: string, role: string): NotificationPrefs {
  const key = `${STORAGE_KEY_PREFIX}${userId}`;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      // First visit — return defaults
      const defaults: NotificationPrefs = {
        channels: { ...DEFAULT_CHANNELS },
        toggles: defaultToggles(role),
      };
      localStorage.setItem(key, JSON.stringify(defaults));
      return defaults;
    }

    const parsed = JSON.parse(raw) as Partial<NotificationPrefs>;

    // Self-heal: ensure all channels exist
    const channels: Record<NotificationChannel, boolean> = {
      inApp: parsed.channels?.inApp ?? DEFAULT_CHANNELS.inApp,
      push: parsed.channels?.push ?? DEFAULT_CHANNELS.push,
      email: parsed.channels?.email ?? DEFAULT_CHANNELS.email,
    };

    // Self-heal: ensure all expected toggles exist for this role
    const expectedDefs = ROLE_TOGGLE_DEFS[role] || [];
    const existingToggles = parsed.toggles || {};
    const toggles: Record<string, boolean> = {};
    for (const def of expectedDefs) {
      toggles[def.key] = existingToggles[def.key] ?? true;
    }

    return { channels, toggles };
  } catch {
    // Corrupt data — reset to defaults
    const defaults: NotificationPrefs = {
      channels: { ...DEFAULT_CHANNELS },
      toggles: defaultToggles(role),
    };
    try { localStorage.setItem(key, JSON.stringify(defaults)); } catch {}
    return defaults;
  }
}

/**
 * Save notification preferences for a user.
 */
export function setNotificationPrefs(userId: string, prefs: NotificationPrefs): void {
  const key = `${STORAGE_KEY_PREFIX}${userId}`;
  try {
    localStorage.setItem(key, JSON.stringify(prefs));
  } catch (err) {
    console.error("[FB-DEBUG] Failed to save notification prefs:", err);
  }
}

/**
 * Quick helper: is a specific notification type allowed on a channel?
 */
export function isNotificationEnabled(
  userId: string,
  role: string,
  toggleKey: string,
  channel: NotificationChannel = "inApp"
): boolean {
  const prefs = getNotificationPrefs(userId, role);
  return prefs.channels[channel] && (prefs.toggles[toggleKey] ?? true);
}
