import { describe, it, expect, beforeEach } from "vitest";
import {
  saveSymptomEntry,
  getSymptomLog,
  getSymptomEntryForDate,
  getRecentSymptomEntries,
  getWellnessParams,
  setWellnessParams,
  getDeviceMetrics,
  setDeviceMetrics,
  isDeviceConnected,
  setDeviceConnected,
  computeNoHighSymptomDays,
  computeAvgSymptomLevel,
  validateSymptomStorage,
  type SymptomLogEntry,
  type DeviceMetric,
} from "@/lib/symptomStorage";

const TEST_USER = "test-user-123";

beforeEach(() => {
  localStorage.clear();
});

describe("Tier 1: Symptom Storage (localStorage ONLY)", () => {
  it("should save and retrieve a symptom entry", () => {
    const entry: SymptomLogEntry = {
      date: "2026-08-05",
      symptomLevels: { "Movement Ease": 3, "Energy Level": 5 },
      notes: "Felt good today",
      createdAt: new Date().toISOString(),
    };

    saveSymptomEntry(TEST_USER, entry);
    const log = getSymptomLog(TEST_USER);

    expect(log).toHaveLength(1);
    expect(log[0].date).toBe("2026-08-05");
    expect(log[0].symptomLevels["Movement Ease"]).toBe(3);
    expect(log[0].notes).toBe("Felt good today");
  });

  it("should replace entry for same date (no duplicates)", () => {
    const entry1: SymptomLogEntry = {
      date: "2026-08-05",
      symptomLevels: { "Energy Level": 5 },
      createdAt: new Date().toISOString(),
    };
    const entry2: SymptomLogEntry = {
      date: "2026-08-05",
      symptomLevels: { "Energy Level": 2 },
      createdAt: new Date().toISOString(),
    };

    saveSymptomEntry(TEST_USER, entry1);
    saveSymptomEntry(TEST_USER, entry2);

    const log = getSymptomLog(TEST_USER);
    expect(log).toHaveLength(1);
    expect(log[0].symptomLevels["Energy Level"]).toBe(2);
  });

  it("should retrieve entry for a specific date", () => {
    const entry: SymptomLogEntry = {
      date: "2026-08-05",
      symptomLevels: { "Focus & Mental Clarity": 4 },
      createdAt: new Date().toISOString(),
    };

    saveSymptomEntry(TEST_USER, entry);
    const found = getSymptomEntryForDate(TEST_USER, "2026-08-05");
    const notFound = getSymptomEntryForDate(TEST_USER, "2026-08-04");

    expect(found).not.toBeNull();
    expect(found?.symptomLevels["Focus & Mental Clarity"]).toBe(4);
    expect(notFound).toBeNull();
  });

  it("should trim to 90 entries max", () => {
    for (let i = 0; i < 100; i++) {
      saveSymptomEntry(TEST_USER, {
        date: `2026-${String(Math.floor(i / 30) + 1).padStart(2, "0")}-${String((i % 30) + 1).padStart(2, "0")}`,
        symptomLevels: { "Energy Level": i },
        createdAt: new Date().toISOString(),
      });
    }

    const log = getSymptomLog(TEST_USER);
    expect(log.length).toBeLessThanOrEqual(90);
  });

  it("should handle corrupted localStorage gracefully", () => {
    localStorage.setItem("fb_symptom_log_" + TEST_USER, "not-json");
    const log = getSymptomLog(TEST_USER);
    expect(log).toEqual([]);
  });

  it("should filter out invalid entries from corrupted log", () => {
    localStorage.setItem(
      "fb_symptom_log_" + TEST_USER,
      JSON.stringify([
        { date: "2026-08-05", symptomLevels: { "Energy Level": 3 } },
        { invalid: true },
        { date: "2026-08-04" }, // missing symptomLevels
      ])
    );

    const log = getSymptomLog(TEST_USER);
    expect(log).toHaveLength(1);
    expect(log[0].date).toBe("2026-08-05");
  });
});

describe("Tier 1: Wellness Parameters", () => {
  it("should save and retrieve wellness params", () => {
    const params = ["Movement Ease", "Flexibility & Range", "Energy Level"];
    setWellnessParams(TEST_USER, params);
    expect(getWellnessParams(TEST_USER)).toEqual(params);
  });

  it("should return empty array for no params", () => {
    expect(getWellnessParams(TEST_USER)).toEqual([]);
  });

  it("should handle corrupted params gracefully", () => {
    localStorage.setItem("fb_wellness_params_" + TEST_USER, "not-json");
    expect(getWellnessParams(TEST_USER)).toEqual([]);
  });
});

describe("Tier 1: Device Metrics", () => {
  it("should save and retrieve device metrics", () => {
    const metrics: DeviceMetric[] = [
      { name: "heart_rate", value: 72, unit: "bpm", timestamp: new Date().toISOString() },
      { name: "steps", value: 5432, unit: "count", timestamp: new Date().toISOString() },
    ];

    setDeviceMetrics(TEST_USER, metrics);
    const retrieved = getDeviceMetrics(TEST_USER);

    expect(retrieved).toHaveLength(2);
    expect(retrieved[0].value).toBe(72);
  });

  it("should handle device connected state", () => {
    expect(isDeviceConnected(TEST_USER)).toBe(false);
    setDeviceConnected(TEST_USER, true);
    expect(isDeviceConnected(TEST_USER)).toBe(true);
    setDeviceConnected(TEST_USER, false);
    expect(isDeviceConnected(TEST_USER)).toBe(false);
  });
});

describe("Tier 3: Derived Metrics (computed, never stored)", () => {
  it("should compute consecutive no-high-symptom days", () => {
    // 3 days with low symptoms, then 1 day with high
    const entries: SymptomLogEntry[] = [
      { date: "2026-08-05", symptomLevels: { "Energy Level": 3 }, createdAt: "" },
      { date: "2026-08-04", symptomLevels: { "Energy Level": 2 }, createdAt: "" },
      { date: "2026-08-03", symptomLevels: { "Energy Level": 1 }, createdAt: "" },
      { date: "2026-08-02", symptomLevels: { "Energy Level": 8 }, createdAt: "" },
    ];

    entries.forEach((e) => saveSymptomEntry(TEST_USER, e));

    const streak = computeNoHighSymptomDays(TEST_USER, 7);
    expect(streak).toBe(3);
  });

  it("should return 0 if most recent entry has high symptoms", () => {
    saveSymptomEntry(TEST_USER, {
      date: "2026-08-05",
      symptomLevels: { "Energy Level": 9 },
      createdAt: "",
    });

    const streak = computeNoHighSymptomDays(TEST_USER, 7);
    expect(streak).toBe(0);
  });

  it("should return 0 for empty log", () => {
    expect(computeNoHighSymptomDays(TEST_USER)).toBe(0);
  });

  it("should compute average symptom level over N days", () => {
    const entries: SymptomLogEntry[] = [
      { date: "2026-08-05", symptomLevels: { "Movement Ease": 4 }, createdAt: "" },
      { date: "2026-08-04", symptomLevels: { "Movement Ease": 6 }, createdAt: "" },
      { date: "2026-08-03", symptomLevels: { "Movement Ease": 2 }, createdAt: "" },
    ];

    entries.forEach((e) => saveSymptomEntry(TEST_USER, e));

    const avg = computeAvgSymptomLevel(TEST_USER, "Movement Ease", 7);
    expect(avg).toBe(4); // (4 + 6 + 2) / 3
  });

  it("should return null if no entries have the param", () => {
    saveSymptomEntry(TEST_USER, {
      date: "2026-08-05",
      symptomLevels: { "Energy Level": 4 },
      createdAt: "",
    });

    const avg = computeAvgSymptomLevel(TEST_USER, "Movement Ease", 7);
    expect(avg).toBeNull();
  });
});

describe("Self-healing: validateSymptomStorage", () => {
  it("should not throw on empty storage", () => {
    expect(() => validateSymptomStorage(TEST_USER)).not.toThrow();
  });

  it("should re-write valid data without corruption", () => {
    const entry: SymptomLogEntry = {
      date: "2026-08-05",
      symptomLevels: { "Energy Level": 3 },
      createdAt: "",
    };
    saveSymptomEntry(TEST_USER, entry);
    setWellnessParams(TEST_USER, ["Energy Level"]);

    validateSymptomStorage(TEST_USER);

    expect(getSymptomLog(TEST_USER)).toHaveLength(1);
    expect(getWellnessParams(TEST_USER)).toEqual(["Energy Level"]);
  });
});

describe("HIPAA Compliance: Data Isolation", () => {
  it("should store all sensitive data under fb_ prefixed localStorage keys", () => {
    saveSymptomEntry(TEST_USER, {
      date: "2026-08-05",
      symptomLevels: { "Energy Level": 3 },
      createdAt: "",
    });
    setWellnessParams(TEST_USER, ["Energy Level"]);
    setDeviceMetrics(TEST_USER, [
      { name: "heart_rate", value: 72, unit: "bpm", timestamp: "" },
    ]);
    setDeviceConnected(TEST_USER, true);

    const keys = Object.keys(localStorage);
    const fbKeys = keys.filter((k) => k.startsWith("fb_"));

    // All sensitive data is under fb_ prefixed keys
    expect(fbKeys).toContain("fb_symptom_log_" + TEST_USER);
    expect(fbKeys).toContain("fb_wellness_params_" + TEST_USER);
    expect(fbKeys).toContain("fb_device_metrics_" + TEST_USER);
    expect(fbKeys).toContain("fb_device_connected_" + TEST_USER);
  });

  it("should isolate data per user", () => {
    saveSymptomEntry("user-A", {
      date: "2026-08-05",
      symptomLevels: { "Energy Level": 3 },
      createdAt: "",
    });
    saveSymptomEntry("user-B", {
      date: "2026-08-05",
      symptomLevels: { "Energy Level": 7 },
      createdAt: "",
    });

    expect(getSymptomEntryForDate("user-A", "2026-08-05")?.symptomLevels["Energy Level"]).toBe(3);
    expect(getSymptomEntryForDate("user-B", "2026-08-05")?.symptomLevels["Energy Level"]).toBe(7);
  });
});
