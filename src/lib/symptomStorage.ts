// ─── Tier 1: Sensitive Health Data (localStorage ONLY) ───────────
// This module is the SINGLE SOURCE OF TRUTH for all sensitive health
// data: raw symptom levels, device metrics, wearable readings.
//
// HIPAA COMPLIANCE: This data NEVER leaves the device. It is NEVER
// sent to Supabase or any remote server. The UI reads from here and
// combines with Tier 2 (Supabase) data client-side for insights.
//
// ── Storage Schema ──────────────────────────────────────────────
// Key: fb_symptom_log_<userId>
// Value: SymptomLogEntry[] (sorted by date desc)
//
// Key: fb_wellness_params_<userId>
// Value: string[] (user's selected wellness parameter names)
//
// Key: fb_device_metrics_<userId>
// Value: DeviceMetric[] (latest wearable readings)
//
// Key: fb_device_connected_<userId>
// Value: boolean

export interface SymptomLogEntry {
  date: string; // YYYY-MM-DD
  symptomLevels: Record<string, number>;
  notes?: string;
  createdAt: string; // ISO timestamp
}

export interface DeviceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: string;
}

const SYMPTOM_LOG_PREFIX = "fb_symptom_log_";
const WELLNESS_PARAMS_PREFIX = "fb_wellness_params_";
const DEVICE_METRICS_PREFIX = "fb_device_metrics_";
const DEVICE_CONNECTED_PREFIX = "fb_device_connected_";

// ─── Symptom Logs ────────────────────────────────────────────────

export function getSymptomLog(userId: string): SymptomLogEntry[] {
  try {
    const raw = localStorage.getItem(SYMPTOM_LOG_PREFIX + userId);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Validate schema
    return parsed.filter(
      (e: any) => e && typeof e.date === "string" && typeof e.symptomLevels === "object"
    );
  } catch {
    return [];
  }
}

export function saveSymptomEntry(userId: string, entry: SymptomLogEntry): void {
  const log = getSymptomLog(userId);
  // Replace existing entry for same date, or prepend
  const filtered = log.filter((e) => e.date !== entry.date);
  filtered.unshift(entry);
  // Keep last 90 entries
  const trimmed = filtered.slice(0, 90);
  localStorage.setItem(SYMPTOM_LOG_PREFIX + userId, JSON.stringify(trimmed));
}

export function getSymptomEntryForDate(userId: string, date: string): SymptomLogEntry | null {
  const log = getSymptomLog(userId);
  return log.find((e) => e.date === date) || null;
}

export function getRecentSymptomEntries(userId: string, days: number = 30): SymptomLogEntry[] {
  const log = getSymptomLog(userId);
  return log.slice(0, days);
}

// ─── Wellness Parameters (user's selected tracking params) ──────

export function getWellnessParams(userId: string): string[] {
  try {
    const raw = localStorage.getItem(WELLNESS_PARAMS_PREFIX + userId);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function setWellnessParams(userId: string, params: string[]): void {
  localStorage.setItem(WELLNESS_PARAMS_PREFIX + userId, JSON.stringify(params));
}

// ─── Device Metrics (wearable readings) ─────────────────────────

export function getDeviceMetrics(userId: string): DeviceMetric[] {
  try {
    const raw = localStorage.getItem(DEVICE_METRICS_PREFIX + userId);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function setDeviceMetrics(userId: string, metrics: DeviceMetric[]): void {
  localStorage.setItem(DEVICE_METRICS_PREFIX + userId, JSON.stringify(metrics));
}

export function isDeviceConnected(userId: string): boolean {
  return localStorage.getItem(DEVICE_CONNECTED_PREFIX + userId) === "true";
}

export function setDeviceConnected(userId: string, connected: boolean): void {
  localStorage.setItem(DEVICE_CONNECTED_PREFIX + userId, connected ? "true" : "false");
}

// ─── Derived Metrics (Tier 3: computed client-side, never stored) ──

/**
 * Compute consecutive days with no high-severity symptoms.
 * Reads from Tier 1 (localStorage) + Tier 2 (check-in streak from caller).
 * This is computed on each call — never persisted.
 */
export function computeNoHighSymptomDays(
  userId: string,
  threshold: number = 7
): number {
  const log = getSymptomLog(userId);
  let count = 0;
  for (const entry of log) {
    const levels = Object.values(entry.symptomLevels);
    const maxLevel = levels.length > 0 ? Math.max(...levels) : 0;
    if (maxLevel < threshold) {
      count++;
    } else {
      break;
    }
  }
  return count;
}

/**
 * Compute average symptom level for a given parameter over N days.
 */
export function computeAvgSymptomLevel(
  userId: string,
  paramName: string,
  days: number = 7
): number | null {
  const log = getRecentSymptomEntries(userId, days);
  const values: number[] = [];
  for (const entry of log) {
    if (paramName in entry.symptomLevels) {
      values.push(entry.symptomLevels[paramName]);
    }
  }
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

// ─── Self-healing: validate & migrate old keys ─────────────────

export function validateSymptomStorage(userId: string): void {
  // Ensure symptom log is valid
  const log = getSymptomLog(userId);
  if (log.length > 0) {
    // Re-write to ensure it's clean
    localStorage.setItem(SYMPTOM_LOG_PREFIX + userId, JSON.stringify(log));
  }

  // Ensure wellness params is valid
  const params = getWellnessParams(userId);
  if (params.length > 0) {
    localStorage.setItem(WELLNESS_PARAMS_PREFIX + userId, JSON.stringify(params));
  }
}
